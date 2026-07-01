import { AssetStore } from './types';

export const mockStore: AssetStore = {
  cash: 3_500_000,
  depositAmount: 150_000_000,

  accounts: [
    { id: 'kb-check', institution: 'KB국민', name: 'KB 입출금', category: 'account', amount: 8_200_000, logo: '/logos/KB.svg' },
    { id: 'kbank-check', institution: '케이뱅크', name: '케이뱅크 입출금', category: 'account', amount: 5_400_000, logo: '/logos/케이뱅크.svg' },
    { id: 'shinhan-check', institution: '신한', name: '신한 입출금', category: 'account', amount: 2_100_000, logo: '/logos/신한.svg' },
    { id: 'kb-saving', institution: 'KB국민', name: 'KB 정기적금', category: 'savings', amount: 12_000_000, logo: '/logos/KB.svg', interestRate: 3.8, maturityDate: '2025-12-01' },
    { id: 'kbank-saving', institution: '케이뱅크', name: '케이뱅크 자유적금', category: 'savings', amount: 4_800_000, logo: '/logos/케이뱅크.svg', interestRate: 4.2, maturityDate: '2025-06-01' },
    { id: 'miraeasset', institution: '미래에셋', name: '미래에셋 CMA', category: 'account', amount: 3_000_000, logo: '/logos/미래에셋.svg' },
    { id: 'kiwoom', institution: '키움증권', name: '키움 위탁계좌 예수금', category: 'account', amount: 1_500_000, logo: '/logos/키움.svg' },
    { id: 'shinhan-loan', institution: '신한', name: '신한 신용대출', category: 'loan', amount: 15_000_000, logo: '/logos/신한.svg', loanRate: 5.2 },
    { id: 'miraeasset-pension', institution: '미래에셋', name: '미래에셋 연금저축펀드', category: 'pension', amount: 18_500_000, logo: '/logos/미래에셋.svg' },
    { id: 'samsung-pension', institution: '삼성생명', name: '삼성 IRP', category: 'pension', amount: 9_200_000, logo: '/logos/삼성.svg' },
    { id: 'samsung-ins', institution: '삼성생명', name: '삼성 종신보험', category: 'insurance', amount: 6_000_000, logo: '/logos/삼성.svg', monthlyPremium: 180_000, coverageAmount: 300_000_000 },
    { id: 'hanwha-ins', institution: '한화생명', name: '한화 실손보험', category: 'insurance', amount: 0, logo: '/logos/한화.svg', monthlyPremium: 65_000, coverageAmount: 50_000_000 },
  ],

  investments: [
    // 삼성전자 — 적립식 4회 매수
    {
      id: 'samsung-elec', type: 'stock', name: '삼성전자', ticker: '005930',
      sector: 'IT/반도체', country: 'kr', currentPrice: 71_400, dailyChangeRate: 1.28,
      institution: '키움증권',
      // 자동 계산용 (transactions 존재 시 덮어씌워짐)
      quantity: 200, purchasePrice: 62_000, purchaseDate: '2023-04-10',
      transactions: [
        { id: 'tx-s1', date: '2023-04-10', quantity: 50, price: 65_000, note: '1차 매수' },
        { id: 'tx-s2', date: '2023-07-15', quantity: 50, price: 70_500, note: '2차 매수' },
        { id: 'tx-s3', date: '2023-11-20', quantity: 60, price: 72_000, note: '3차 매수' },
        { id: 'tx-s4', date: '2024-03-08', quantity: 40, price: 80_000, note: '4차 매수 (급등 전)' },
      ],
    },
    // 카카오 — 2회 매수 (손실 중)
    {
      id: 'kakao', type: 'stock', name: '카카오', ticker: '035720',
      sector: 'IT/플랫폼', country: 'kr', currentPrice: 43_200, dailyChangeRate: -0.92,
      institution: '키움증권',
      quantity: 50, purchasePrice: 58_000, purchaseDate: '2023-08-22',
      transactions: [
        { id: 'tx-k1', date: '2023-08-22', quantity: 30, price: 55_000, note: '1차 매수' },
        { id: 'tx-k2', date: '2024-01-10', quantity: 20, price: 63_000, note: '물타기' },
      ],
    },
    // SK하이닉스 — 단일 매수
    {
      id: 'sk-hynix', type: 'stock', name: 'SK하이닉스', ticker: '000660',
      sector: 'IT/반도체', country: 'kr', currentPrice: 168_000, dailyChangeRate: 2.11,
      institution: '미래에셋',
      quantity: 30, purchasePrice: 118_000, purchaseDate: '2024-01-15',
      transactions: [
        { id: 'tx-h1', date: '2024-01-15', quantity: 30, price: 118_000, note: '단일 매수' },
      ],
    },
    // 비트코인 — 3회 적립식
    {
      id: 'bitcoin', type: 'crypto', name: '비트코인', ticker: 'BTC',
      sector: '가상자산', currentPrice: 98_500_000, dailyChangeRate: 3.45,
      institution: '업비트',
      quantity: 0.15, purchasePrice: 62_000_000, purchaseDate: '2023-11-05',
      transactions: [
        { id: 'tx-b1', date: '2023-11-05', quantity: 0.05, price: 48_000_000, note: '1차' },
        { id: 'tx-b2', date: '2024-01-22', quantity: 0.05, price: 62_000_000, note: '2차 (반감기 전)' },
        { id: 'tx-b3', date: '2024-04-15', quantity: 0.05, price: 91_000_000, note: '3차 (반감기 후)' },
      ],
    },
    // 이더리움 — 2회
    {
      id: 'ethereum', type: 'crypto', name: '이더리움', ticker: 'ETH',
      sector: '가상자산', currentPrice: 4_850_000, dailyChangeRate: 2.78,
      institution: '업비트',
      quantity: 1.2, purchasePrice: 3_200_000, purchaseDate: '2024-03-20',
      transactions: [
        { id: 'tx-e1', date: '2024-03-20', quantity: 0.7, price: 3_800_000, note: '1차' },
        { id: 'tx-e2', date: '2024-06-10', quantity: 0.5, price: 4_200_000, note: '2차' },
      ],
    },
    // 금 — 단위: 돈(3.75g), 가격: 원/돈
    {
      id: 'gold', type: 'gold', name: '금 (KRX)', ticker: 'GOLD',
      sector: '금', currentPrice: 382_500, dailyChangeRate: 0.34,
      institution: '키움증권',
      quantity: 14, purchasePrice: 318_750, purchaseDate: '2023-06-01',
      transactions: [
        { id: 'tx-g1', date: '2023-06-01', quantity: 3, price: 307_500, note: '1차' },   // 82,000/g × 3.75
        { id: 'tx-g2', date: '2023-09-01', quantity: 4, price: 318_750, note: '2차' },   // 85,000/g × 3.75
        { id: 'tx-g3', date: '2024-01-01', quantity: 4, price: 330_000, note: '3차' },   // 88,000/g × 3.75
        { id: 'tx-g4', date: '2024-06-01', quantity: 3, price: 356_250, note: '4차' },   // 95,000/g × 3.75
      ],
    },
  ],

  physicalAssets: [
    { id: 'car1', category: 'car' as const, name: '현대 아반떼 CN7', year: 2022, purchasePrice: 22_500_000, currentValue: 17_800_000, purchaseDate: '2022-03-15' },
  ],

  history: [
    { date: '2024-07', total: 218_000_000, cash: 2_000_000, stock: 28_000_000, crypto: 11_000_000, gold: 4_000_000, account: 18_000_000, savings: 14_000_000, loan: 18_000_000, deposit: 150_000_000, car: 20_000_000, pension: 22_000_000, insurance: 0 },
    { date: '2024-08', total: 224_000_000, cash: 2_200_000, stock: 29_500_000, crypto: 12_500_000, gold: 4_100_000, account: 19_000_000, savings: 15_000_000, loan: 17_500_000, deposit: 150_000_000, car: 19_800_000, pension: 23_000_000, insurance: 0 },
    { date: '2024-09', total: 231_000_000, cash: 2_500_000, stock: 31_000_000, crypto: 13_800_000, gold: 4_200_000, account: 20_500_000, savings: 15_500_000, loan: 17_000_000, deposit: 150_000_000, car: 19_500_000, pension: 24_000_000, insurance: 0 },
    { date: '2024-10', total: 238_000_000, cash: 2_800_000, stock: 33_500_000, crypto: 15_000_000, gold: 4_300_000, account: 21_000_000, savings: 16_000_000, loan: 16_500_000, deposit: 150_000_000, car: 19_200_000, pension: 25_000_000, insurance: 0 },
    { date: '2024-11', total: 248_000_000, cash: 3_000_000, stock: 36_000_000, crypto: 20_000_000, gold: 4_500_000, account: 21_500_000, savings: 16_500_000, loan: 16_000_000, deposit: 150_000_000, car: 18_900_000, pension: 26_000_000, insurance: 0 },
    { date: '2024-12', total: 255_000_000, cash: 3_200_000, stock: 37_000_000, crypto: 22_000_000, gold: 4_700_000, account: 22_000_000, savings: 17_000_000, loan: 15_500_000, deposit: 150_000_000, car: 18_800_000, pension: 27_000_000, insurance: 0 },
    { date: '2025-01', total: 261_000_000, cash: 3_300_000, stock: 38_500_000, crypto: 23_500_000, gold: 4_900_000, account: 22_500_000, savings: 17_500_000, loan: 15_000_000, deposit: 150_000_000, car: 18_500_000, pension: 27_500_000, insurance: 0 },
    { date: '2025-02', total: 267_000_000, cash: 3_400_000, stock: 39_000_000, crypto: 24_800_000, gold: 5_000_000, account: 23_000_000, savings: 16_800_000, loan: 14_500_000, deposit: 150_000_000, car: 18_300_000, pension: 27_800_000, insurance: 6_000_000 },
    { date: '2025-03', total: 272_000_000, cash: 3_500_000, stock: 39_500_000, crypto: 25_500_000, gold: 5_100_000, account: 23_500_000, savings: 17_000_000, loan: 14_500_000, deposit: 150_000_000, car: 18_100_000, pension: 28_100_000, insurance: 6_000_000 },
    { date: '2025-04', total: 278_000_000, cash: 3_500_000, stock: 40_500_000, crypto: 26_500_000, gold: 5_100_000, account: 23_500_000, savings: 17_300_000, loan: 15_000_000, deposit: 150_000_000, car: 17_900_000, pension: 27_900_000, insurance: 6_000_000 },
    { date: '2025-05', total: 285_000_000, cash: 3_500_000, stock: 42_000_000, crypto: 29_000_000, gold: 5_100_000, account: 23_800_000, savings: 16_800_000, loan: 15_000_000, deposit: 150_000_000, car: 17_800_000, pension: 27_700_000, insurance: 6_000_000 },
    { date: '2025-06', total: 293_550_000, cash: 3_500_000, stock: 44_610_000, crypto: 20_325_000, gold: 5_100_000, account: 20_200_000, savings: 16_800_000, loan: 15_000_000, deposit: 150_000_000, car: 17_800_000, pension: 27_700_000, insurance: 6_000_000 },
  ],

  annualSnapshots: [],
  isOnboarded: true,
};
