export type PurchaseCategory =
  | 'Träningsutrustning'
  | 'Kontorsmaterial'
  | 'IT-utrustning'
  | 'Möbler'
  | 'Förbrukningsmaterial'
  | 'Marknadsföring'
  | 'Övrigt';

export type PurchaseStatus =
  | 'Väntar'
  | 'Godkänd'
  | 'Beställd'
  | 'Levererad'
  | 'Avbruten';

export interface StatusHistoryEntry {
  status: PurchaseStatus;
  changedBy: string;
  changedByEmail: string;
  changedAt: Date;
}

export interface Purchase {
  id: string;
  date: Date;
  createdBy: string;
  createdByName?: string;
  category: PurchaseCategory;
  product: string;
  priority: 1 | 2 | 3 | 4;
  location?: string;
  estimatedCost?: number;
  actualCost?: number;
  status: PurchaseStatus;
  statusHistory?: StatusHistoryEntry[];
  notes?: string;
  supplier?: string;
  costCenter?: string;
  approvedBy?: string;
  expectedDeliveryDate?: Date;
  receiptReceived?: boolean;
  createdAt: Date;
}
