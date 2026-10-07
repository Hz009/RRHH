const READ_ONLY_MESSAGE =
  "Este proyecto solo consulta los datos. Para crear o modificar información usa el portal principal.";

const QUERY_WRITES = new Set(["insert", "update", "upsert", "delete"]);
const STORAGE_WRITES = new Set(["upload", "update", "remove", "move", "copy"]);
const AUTH_WRITES = new Set(["updateUser", "signUp", "resetPasswordForEmail"]);
const AUTH_ADMIN_WRITES = new Set(["createUser", "updateUserById", "deleteUser", "inviteUserByEmail"]);

export function isDataReadOnly() {
  const mode = process.env.HR_DATA_MODE ?? process.env.NEXT_PUBLIC_HR_DATA_MODE ?? "read-only";
  return mode !== "read-write";
}

function blockedQuery() {
  const result = {
    data: null,
    error: { message: READ_ONLY_MESSAGE, code: "READ_ONLY" },
    count: null,
    status: 403,
    statusText: "Forbidden",
  };
  const promise = Promise.resolve(result);
  const chain: object = new Proxy(function blocked() {}, {
    get(_target, prop) {
      if (prop === "then") return promise.then.bind(promise);
      if (prop === "catch") return promise.catch.bind(promise);
      if (prop === "finally") return promise.finally.bind(promise);
      return () => chain;
    },
  });
  return chain;
}

function blockedAuth() {
  return Promise.resolve({
    data: { user: null, session: null },
    error: { message: READ_ONLY_MESSAGE, name: "AuthApiError", status: 403 },
  });
}

function wrapQuery(builder: object) {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && QUERY_WRITES.has(prop)) {
        return () => blockedQuery();
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function wrapBucket(bucket: object) {
  return new Proxy(bucket, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && STORAGE_WRITES.has(prop)) {
        return async () => ({ data: null, error: { message: READ_ONLY_MESSAGE } });
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function wrapStorage(storage: object) {
  return new Proxy(storage, {
    get(target, prop, receiver) {
      if (prop === "from") {
        const from = (target as { from: (id: string) => object }).from;
        return (bucket: string) => wrapBucket(Reflect.apply(from, target, [bucket]));
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function wrapAuthAdmin(admin: object) {
  return new Proxy(admin, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && AUTH_ADMIN_WRITES.has(prop)) {
        return async () => ({ data: null, error: { message: READ_ONLY_MESSAGE, status: 403 } });
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function wrapAuth(auth: object) {
  return new Proxy(auth, {
    get(target, prop, receiver) {
      if (prop === "admin") {
        return wrapAuthAdmin(Reflect.get(target, "admin", receiver) as object);
      }
      if (typeof prop === "string" && AUTH_WRITES.has(prop)) {
        return async () => blockedAuth();
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export function withReadOnlyData<T extends object>(client: T): T {
  if (!isDataReadOnly()) return client;

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "from") {
        return (table: string) =>
          wrapQuery(Reflect.apply((target as { from: (name: string) => object }).from, target, [table]));
      }
      if (prop === "storage") {
        return wrapStorage(Reflect.get(target, "storage", receiver) as object);
      }
      if (prop === "auth") {
        return wrapAuth(Reflect.get(target, "auth", receiver) as object);
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as T;
}
