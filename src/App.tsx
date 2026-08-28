import React, { useState } from 'react';
import { StoreProvider, useStore } from '@/services/storeContext';
import { Navbar } from '@/components/layout/Navbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { LoginScreen } from '@/screens/LoginScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { NewSaleScreen } from '@/screens/NewSaleScreen';
import { SalesRegisterScreen } from '@/screens/SalesRegisterScreen';
import { PackingSheetScreen } from '@/screens/PackingSheetScreen';
import { InventoryScreen } from '@/screens/InventoryScreen';
import { PriceCalculatorScreen } from '@/screens/PriceCalculatorScreen';
import { SampleMasterScreen } from '@/screens/SampleMasterScreen';
import { ProfitDashboardScreen } from '@/screens/ProfitDashboardScreen';
import { MasterDataScreen } from '@/screens/MasterDataScreen';
import { ReservationsScreen } from '@/screens/ReservationsScreen';
import { PurchasesScreen } from '@/screens/PurchasesScreen';
import { ReportsScreen } from '@/screens/ReportsScreen';

export const AppContent: React.FC = () => {
  const { user, loading } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPackingOrderId, setSelectedPackingOrderId] = useState<string | undefined>();

  const openPackingSheet = (orderId: string) => {
    setSelectedPackingOrderId(orderId);
    setActiveTab('packing');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-foreground text-background mb-4 animate-pulse">
          <span className="font-serif font-bold text-xl tracking-wider">ASJ</span>
        </div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground animate-pulse">
          Loading system...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-12">
        <div key={activeTab} className="animate-view-fade">
          {activeTab === 'dashboard' && <DashboardScreen onNavigate={setActiveTab} />}
          {activeTab === 'sales' && <NewSaleScreen onComplete={() => setActiveTab('register')} />}
          {activeTab === 'reservations' && (
            <ReservationsScreen
              onNavigateToOrder={(orderId) => {
                openPackingSheet(orderId);
              }}
            />
          )}
          {activeTab === 'register' && <SalesRegisterScreen onOpenPacking={openPackingSheet} />}
          {activeTab === 'packing' && (
            <PackingSheetScreen
              selectedOrderId={selectedPackingOrderId}
              onBack={() => setActiveTab('register')}
            />
          )}
          {activeTab === 'inventory' && <InventoryScreen />}
          {activeTab === 'purchases' && <PurchasesScreen />}
          {activeTab === 'calculator' && <PriceCalculatorScreen />}
          {activeTab === 'samples' && <SampleMasterScreen />}
          {activeTab === 'reports' && <ReportsScreen />}
          {activeTab === 'profit' && <ProfitDashboardScreen />}
          {activeTab === 'masters' && <MasterDataScreen />}
        </div>
      </main>

      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
