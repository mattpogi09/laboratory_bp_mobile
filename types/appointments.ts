// Appointment types
export interface AppointmentTest {
    id?: number;
    name: string;
    category?: string;
    price: number;
}

export interface AppointmentTransaction {
    id: number;
    transaction_number: string;
    queue_number?: number;
    payment_status: string;
    lab_status: string;
    cashier?: string;
    created_at: string;
}

export type AppointmentStatus =
    | "PENDING"
    | "CHECKED_IN"
    | "CONFIRMED"
    | "CANCELLED"
    | "NO_SHOW";

export interface Appointment {
    id: number;
    reference_number: string;
    patient_name: string;
    patient_email?: string;
    patient_phone?: string;
    date_of_birth?: string;
    age?: number;
    gender?: string;
    appointment_date: string;
    appointment_time: string;
    grace_period_end?: string;
    status: AppointmentStatus;
    priority_level?: string;
    arrival_time?: string;
    minutes_late?: number;
    notes?: string;
    tests: AppointmentTest[];
    total_amount: number;
    has_transaction?: boolean;
    transaction_number?: string;
    transaction?: AppointmentTransaction | null;
    created_at: string;
}

export interface AppointmentStats {
    total: number;
    pending: number;
    checked_in: number;
    confirmed: number;
    cancelled: number;
    no_show: number;
}

export interface AppointmentsResponse {
    data: Appointment[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    stats: AppointmentStats;
}

// TestCategory types
export interface TestCategory {
    id: number;
    name: string;
    description?: string;
    display_order: number;
    color: string;
    is_active: boolean;
    created_at?: string;
}

export interface TestCategoriesResponse {
    data: TestCategory[];
}

// InventoryCategory types
export interface InventoryCategory {
    id: number;
    name: string;
    description?: string;
    display_order: number;
    color: string;
    is_active: boolean;
    created_at?: string;
}

export interface InventoryCategoriesResponse {
    data: InventoryCategory[];
}

// Notification types
export interface AppNotification {
    id: number;
    type: string;
    title?: string;
    message: string;
    read: boolean;
    recipient_id?: number;
    recipient_role?: string;
    data?: Record<string, any>;
    created_at: string;
}

export interface NotificationStats {
    total: number;
    unread: number;
    refunds?: number;
    cancelled?: number;
    lab_issues?: number;
    system_alerts?: number;
}

export interface NotificationsResponse {
    data: AppNotification[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    stats: NotificationStats;
}

// Settings types
export interface ClinicSettings {
    patient_portal_enabled: boolean;
    email_sending_enabled: boolean;
    email_notification_enabled: boolean;
    notification_enabled: boolean;
    pdf_password_format: "birthdate" | "last_name" | "none";
    clinic_header_logo_exists: boolean;
    pathologist_user_id: number | null;
    chief_med_tech_user_id: number | null;
}

export interface LabStaffUser {
    id: number;
    name: string;
    license_number?: string;
    professional_title?: string;
    lab_role: "pathologist" | "chief_med_tech" | "staff" | null;
    has_signature: boolean;
}

export interface SettingsResponse {
    settings: ClinicSettings;
    lab_staff: LabStaffUser[];
}

// Refund types
export type RefundStatus = "pending" | "approved" | "denied" | "completed";

export interface RefundRequest {
    id: number;
    refund_type: "full" | "partial";
    selected_test_ids: number[];
    refund_amount: number;
    total_transaction_amount: number;
    reason: string;
    admin_notes?: string;
    status: RefundStatus;
    approved_at?: string;
    denied_at?: string;
    created_at: string;
    tests: { id: number; test_name: string; price: number }[];
    transaction?: {
        id: number;
        transaction_number: string;
        status: string;
        patient?: { id: number; full_name: string };
    };
    requested_by?: { id: number; name: string };
    approved_by?: { id: number; name: string };
}

export interface RefundsMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

export interface RefundsResponse {
    data: RefundRequest[];
    meta: RefundsMeta;
}
