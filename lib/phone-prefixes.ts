import phonePrefixOptions from "@/lib/phone-prefix-options.json";

export type PhonePrefix = { value: string; label: string };

/** Prefijos ya ordenados, con el nombre del país en español. */
export function getPhonePrefixes(): PhonePrefix[] {
  return phonePrefixOptions as PhonePrefix[];
}
