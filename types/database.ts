export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type EmployeeRole = "admin" | "manager" | "employee";
export type EmploymentStatus = "active" | "on_leave" | "inactive";
export type EmployeeType = "full_time" | "part_time" | "hourly";
export type PaymentMethod = "bank" | "paypal" | "wise";
export type LoanStatus = "draft" | "active" | "paid" | "defaulted" | "cancelled";
export type VacationRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type HourlyHoursSource = "punch" | "manual_monthly";
export type HoursBalanceKind = "grant" | "use" | "repay" | "adjustment";
export type AttendanceEventType = "clock_in" | "clock_out" | "break_start" | "break_end";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: EmployeeRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: EmployeeRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      employees: {
        Row: {
          id: string;
          employee_code: string;
          full_name: string;
          first_name: string | null;
          last_name: string | null;
          email: string;
          phone: string | null;
          phone_prefix: string | null;
          whatsapp_prefix: string | null;
          whatsapp_number: string | null;
          nationality: string | null;
          residence_country: string | null;
          legal_name_bank: string | null;
          identity_document: string | null;
          address_line: string | null;
          address_country: string | null;
          address_city: string | null;
          address_postal_code: string | null;
          bank_name: string | null;
          bank_account_number: string | null;
          bank_account_type: "savings" | "checking" | null;
          swift_bic: string | null;
          bank_route_number: string | null;
          paypal_email: string | null;
          invoice_currency: string | null;
          employee_type: EmployeeType;
          hourly_hours_source: HourlyHoursSource | null;
          payment_method: PaymentMethod | null;
          payment_account: string | null;
          department: string;
          job_title: string;
          manager_id: string | null;
          hire_date: string;
          employment_status: EmploymentStatus;
          current_salary_amount: number;
          current_salary_currency: string;
          current_salary_effective_date: string | null;
          vacation_days_per_year: number;
          vacation_days_used: number;
          notes: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["employees"]["Row"]> & {
          employee_code: string;
          full_name: string;
          email: string;
          department: string;
          job_title: string;
          hire_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["employees"]["Insert"]>;
      };
      salary_history: {
        Row: {
          id: string;
          employee_id: string;
          amount: number;
          currency: string;
          effective_date: string;
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["salary_history"]["Row"]> & {
          employee_id: string;
          amount: number;
          currency?: string;
          effective_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["salary_history"]["Insert"]>;
      };
      employee_compensation_history: {
        Row: {
          id: string;
          employee_id: string;
          effective_date: string;
          employee_type: EmployeeType;
          payment_method: PaymentMethod | null;
          payment_account: string | null;
          amount: number;
          currency: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["employee_compensation_history"]["Row"]> & {
          employee_id: string;
          effective_date: string;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["employee_compensation_history"]["Insert"]>;
      };
      job_department_history: {
        Row: {
          id: string;
          employee_id: string;
          department: string;
          job_title: string;
          effective_date: string;
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["job_department_history"]["Row"]> & {
          employee_id: string;
          department: string;
          job_title: string;
          effective_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["job_department_history"]["Insert"]>;
      };
      employee_loans: {
        Row: {
          id: string;
          employee_id: string;
          description: string;
          principal_amount: number;
          currency: string;
          installments_total: number;
          installments_paid: number;
          installment_amount: number;
          start_date: string;
          payroll_deduction_enabled: boolean;
          payroll_deduction_code: string | null;
          outstanding_balance: number;
          status: LoanStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["employee_loans"]["Row"]> & {
          employee_id: string;
          description: string;
          principal_amount: number;
          installments_total: number;
          installment_amount: number;
          start_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["employee_loans"]["Insert"]>;
      };
      loan_repayments: {
        Row: {
          id: string;
          loan_id: string;
          employee_id: string;
          amount: number;
          paid_on: string;
          source: string;
          payroll_period: string | null;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["loan_repayments"]["Row"]> & {
          loan_id: string;
          employee_id: string;
          amount: number;
          paid_on: string;
        };
        Update: Partial<Database["public"]["Tables"]["loan_repayments"]["Insert"]>;
      };
      vacation_requests: {
        Row: {
          id: string;
          employee_id: string;
          start_date: string;
          end_date: string;
          days_requested: number;
          request_status: VacationRequestStatus;
          reason: string | null;
          request_kind: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["vacation_requests"]["Row"]> & {
          employee_id: string;
          start_date: string;
          end_date: string;
          days_requested: number;
        };
        Update: Partial<Database["public"]["Tables"]["vacation_requests"]["Insert"]>;
      };
      attendance_records: {
        Row: {
          id: string;
          employee_id: string;
          event_type: AttendanceEventType;
          occurred_at: string;
          source: string;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["attendance_records"]["Row"]> & {
          employee_id: string;
          event_type: AttendanceEventType;
          occurred_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance_records"]["Insert"]>;
      };
      employee_hours_balance_ledger: {
        Row: {
          id: string;
          employee_id: string;
          occurred_at: string;
          delta_hours: number;
          kind: HoursBalanceKind;
          reason: string | null;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["employee_hours_balance_ledger"]["Row"]> & {
          employee_id: string;
          occurred_at: string;
          delta_hours: number;
          kind: HoursBalanceKind;
        };
        Update: Partial<Database["public"]["Tables"]["employee_hours_balance_ledger"]["Insert"]>;
      };
      employee_monthly_hours: {
        Row: {
          id: string;
          employee_id: string;
          period_month: string;
          hours_worked: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["employee_monthly_hours"]["Row"]> & {
          employee_id: string;
          period_month: string;
          hours_worked: number;
        };
        Update: Partial<Database["public"]["Tables"]["employee_monthly_hours"]["Insert"]>;
      };
      employee_payments: {
        Row: {
          id: string;
          employee_id: string;
          period_month: string;
          amount_paid: number;
          currency: string;
          payment_method: PaymentMethod;
          payment_account: string | null;
          employee_type: EmployeeType;
          hours_worked: number;
          base_amount: number;
          paid_at: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["employee_payments"]["Row"]> & {
          employee_id: string;
          period_month: string;
          amount_paid: number;
        };
        Update: Partial<Database["public"]["Tables"]["employee_payments"]["Insert"]>;
      };
      employee_monthly_bonuses: {
        Row: {
          id: string;
          employee_id: string;
          period_month: string;
          bonus_date: string;
          amount: number;
          currency: string;
          concept: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["employee_monthly_bonuses"]["Row"]> & {
          employee_id: string;
          period_month: string;
          bonus_date: string;
          amount: number;
          concept: string;
        };
        Update: Partial<Database["public"]["Tables"]["employee_monthly_bonuses"]["Insert"]>;
      };
      documents: {
        Row: {
          id: string;
          employee_id: string | null;
          title: string;
          category: string;
          file_path: string;
          requires_ack: boolean;
          is_global: boolean;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["documents"]["Row"]> & {
          title: string;
          category: string;
          file_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
      };
      document_acknowledgements: {
        Row: {
          id: string;
          document_id: string;
          employee_id: string;
          acknowledged_at: string;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["document_acknowledgements"]["Row"]> & {
          document_id: string;
          employee_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_acknowledgements"]["Insert"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_email: string | null;
          module: string;
          action: string;
          entity_name: string;
          entity_id: string;
          previous_data: Json | null;
          new_data: Json | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & {
          module: string;
          action: string;
          entity_name: string;
          entity_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
