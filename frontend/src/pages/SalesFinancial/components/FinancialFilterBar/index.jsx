import React from 'react';
import PeriodDateSelector from './PeriodDateSelector';
import LabelFilterDropdown from './LabelFilterDropdown';
import PlatformFilterDropdown from './PlatformFilterDropdown';
import StatusFilterDropdown from './StatusFilterDropdown';
import ProductFilterDropdown from './ProductFilterDropdown';
import PaymentMethodSelector from './PaymentMethodSelector';

export {
  PERIOD_OPTIONS,
  STATUS_FILTER_OPTIONS,
  PLATFORM_FILTER_OPTIONS,
  PAYMENT_METHOD_OPTIONS
} from './filterOptions';

export default function FinancialFilterBar({
  period,
  setPeriod,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedLabels,
  setSelectedLabels,
  allLabels = [],
  platforms,
  setPlatforms,
  statuses,
  setStatuses,
  selectedProducts,
  setSelectedProducts,
  allProducts = [],
  paymentMethod,
  setPaymentMethod,
  onResetTxPage,
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Period Selector & Date Inputs */}
      <PeriodDateSelector
        period={period}
        setPeriod={setPeriod}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
      />

      {/* Row of Multi-select Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <LabelFilterDropdown
          selectedLabels={selectedLabels}
          setSelectedLabels={setSelectedLabels}
          allLabels={allLabels}
        />

        <PlatformFilterDropdown
          platforms={platforms}
          setPlatforms={setPlatforms}
        />

        <StatusFilterDropdown
          statuses={statuses}
          setStatuses={setStatuses}
        />

        <ProductFilterDropdown
          selectedProducts={selectedProducts}
          setSelectedProducts={setSelectedProducts}
          allProducts={allProducts}
        />

        <PaymentMethodSelector
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          onResetTxPage={onResetTxPage}
        />
      </div>
    </div>
  );
}
