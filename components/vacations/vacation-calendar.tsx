"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database";

type VacationRequest = Database["public"]["Tables"]["vacation_requests"]["Row"];

interface VacationCalendarProps {
  requests: VacationRequest[];
  employees: Array<{ id: string; full_name: string }>;
  role: "admin" | "manager" | "employee";
  currentEmployeeId: string | null;
}

export function VacationCalendar({ requests, employees, role, currentEmployeeId }: VacationCalendarProps) {
  const isEmployee = role === "employee";
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    role === "admin" ? "all" : currentEmployeeId ?? "all"
  );

  const employeeNameById = useMemo(
    () => new Map(employees.map((e) => [e.id, e.full_name])),
    [employees]
  );

  function goToPrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  const filteredRequests = useMemo(
    () =>
      requests.filter((r) => {
        if (isEmployee && currentEmployeeId) return r.employee_id === currentEmployeeId;
        if (selectedEmployeeId === "all") return true;
        return r.employee_id === selectedEmployeeId;
      }),
    [requests, isEmployee, currentEmployeeId, selectedEmployeeId]
  );

  const firstDay = new Date(currentYear, currentMonth, 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthLabel = firstDay.toLocaleString("es-ES", {
    month: "long",
    year: "numeric",
  });

  const requestsByDate = useMemo(() => {
    const map = new Map<string, VacationRequest[]>();
    for (const request of filteredRequests) {
      if (
        request.request_status === "rejected" ||
        request.request_status === "cancelled"
      )
        continue;
      const cursor = new Date(request.start_date);
      const end = new Date(request.end_date);
      while (cursor <= end) {
        if (
          cursor.getFullYear() === currentYear &&
          cursor.getMonth() === currentMonth
        ) {
          const key = cursor.toISOString().slice(0, 10);
          const list = map.get(key) ?? [];
          list.push(request);
          map.set(key, list);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [filteredRequests, currentYear, currentMonth]);

  const cells: Array<{ date: string | null; day: number | null }> = [];
  for (let i = 0; i < firstWeekday; i += 1)
    cells.push({ date: null, day: null });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(currentYear, currentMonth, day)
      .toISOString()
      .slice(0, 10);
    cells.push({ date, day });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="h-8 w-8 p-0" onClick={goToPrevMonth}>
            <ChevronLeft size={16} />
          </Button>
          <span className="min-w-[160px] text-center text-sm font-semibold capitalize text-zinc-900">
            {monthLabel}
          </span>
          <Button variant="ghost" className="h-8 w-8 p-0" onClick={goToNextMonth}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {!isEmployee ? (
        <div className="flex items-center gap-2">
          <label htmlFor="vacation-employee-filter" className="text-xs font-medium text-zinc-600">
            Empleado:
          </label>
          <select
            id="vacation-employee-filter"
            value={selectedEmployeeId}
            onChange={(event) => setSelectedEmployeeId(event.target.value)}
            className="h-9 min-w-[240px] rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-700"
          >
            {role === "admin" ? <option value="all">Todos los empleados</option> : null}
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid grid-cols-7 gap-2 text-xs text-zinc-600">
        {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((d) => (
          <div key={d} className="px-2 font-semibold">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell, idx) => {
          if (!cell.date || !cell.day) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-24 rounded border border-transparent bg-transparent"
              />
            );
          }

          const dayRequests = requestsByDate.get(cell.date) ?? [];
          return (
            <div
              key={cell.date}
              className="min-h-24 rounded border border-zinc-200 bg-white p-2"
            >
              <p className="text-xs font-semibold text-zinc-700">{cell.day}</p>
              <div className="mt-1 space-y-1">
                {dayRequests.slice(0, 3).map((request) => (
                  <div
                    key={`${request.id}-${cell.date}`}
                    className={`truncate rounded px-1 py-0.5 text-[10px] ${
                      request.request_status === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                    title={`${
                      employeeNameById.get(request.employee_id) ??
                      request.employee_id
                    } (${formatDate(request.start_date)} - ${formatDate(
                      request.end_date
                    )})`}
                  >
                    {employeeNameById.get(request.employee_id) ?? "Empleado"}
                  </div>
                ))}
                {dayRequests.length > 3 ? (
                  <p className="text-[10px] text-zinc-500">
                    +{dayRequests.length - 3} mas
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
