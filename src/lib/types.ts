export type AssetCategory =
  | 'cash'
  | 'stock'
  | 'crypto'
  | 'gold'
  | 'account'
  | 'savings'
  | 'loan'
  | 'deposit'
  | 'car'
  | 'pension'
  | 'insurance';

export interface Account {
  id: string;
  institution: string;
  name: string;
  category: AssetCategory;
  amount: number;
  logo?: string;
  maturityDate?: string;
  interestRate?: number;
  loanRate?: number;
  monthlyPremium?: number;
  coverageAmount?: number;
}

export interface Transaction {
  id: string;
  date: string;
  quantity: number;
  price: number;
  note?: string;
}

export interface Investment {
  id: string;
  type: 'stock' | 'crypto' | 'gold';
  name: string;
  ticker?: string;
  sector?: string;
  country?: string;
  transactions?: Transaction[];
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  currentPrice: number;
  dailyChangeRate?: number;
  institution?: string;
}

export interface Car {
  id: string;
  model: string;
  year: number;
  purchasePrice: number;
  currentValue: number;
  purchaseDate: string;
}

/** 스냅샷 시점의 개별 투자 종목 상태 */
export interface SnapshotInvestment {
  id: string;
  name: string;
  ticker?: string;
  type: 'stock' | 'crypto' | 'gold';
  quantity: number;         // 보유 수량 (주 / 개 / 돈)
  avgPrice: number;         // 가중평균 매수가
  priceAtSnapshot: number;  // 스냅샷 시점 현재가
  valueAtSnapshot: number;  // 스냅샷 시점 평가금액
  profitAtSnapshot: number; // 스냅샷 시점 손익
  roiAtSnapshot: number;    // 스냅샷 시점 수익률 (%)
}

export interface MonthlySnapshot {
  date: string; // YYYY-MM
  total: number;
  cash: number;
  stock: number;
  crypto: number;
  gold: number;
  account: number;
  savings: number;
  loan: number;
  deposit: number;
  car: number;
  pension: number;
  insurance: number;
  /** 스냅샷 시점의 투자 종목 세부 상태 */
  investmentDetails?: SnapshotInvestment[];
}

export interface AnnualSnapshot {
  date: string;  // YYYY-MM — 해당 월 기준 총자산
  total: number;
  note?: string;
}

export interface AssetStore {
  cash: number;
  accounts: Account[];
  investments: Investment[];
  cars: Car[];
  depositAmount: number;
  history: MonthlySnapshot[];
  annualSnapshots: AnnualSnapshot[];
  isOnboarded: boolean; // 초기 설정 완료 여부
}
