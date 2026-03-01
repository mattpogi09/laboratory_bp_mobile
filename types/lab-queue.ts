export type TestItem = {
    id: number;
    transaction_id: number;
    transaction_number: string | null;
    queue_number: number | null;
    patient: string;
    patient_id: number | null;
    patient_contact: string | null;
    patient_age: number | null;
    has_appointment: boolean;
    priority_level: string | null;
    test: string;
    category?: string;
    case_number?: string | null;
    status: string;
    price: number;
    queued_at: string | null;
    created_at: string;
};

export type SummaryResponse = {
    counts: {
        pending: number;
        processing: number;
        completed: number;
        released: number;
    };
    up_next: {
        id: number;
        transaction_id: number;
        transaction_number: string | null;
        queue_number: number | null;
        patient: string;
        patient_id: number | null;
        patient_contact: string | null;
        priority_level: string | null;
        test: string;
        category?: string;
        case_number?: string | null;
        status: string;
        queued_at: string | null;
        created_at: string;
    }[];
};

export type Meta = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
};
