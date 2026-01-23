export interface PriceInfo {
  low: string;
  high: string;
}

export interface ItemInfo {
  name: string;
  description: string;
}

export interface SourceInfo {
  url: string;
  type: string;
}

export interface WorkflowResult {
  price: PriceInfo;
  confidence: number;
  sources: SourceInfo[];
  item: ItemInfo;
}

export type MessageRole = 'user' | 'assistant';
