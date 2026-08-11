import { useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import CurrentMonthCard from './CurrentMonthCard';
import ServicePoMonthlyBudgetModal from './ServicePoMonthlyBudgetModal';
import { useCurrentServicePoMonthlyBudget } from '@/hooks/useServicePoMonthlyBudget';

const ServicePoMonthlyBudgetPage = () => {
  const { data, isPending } = useCurrentServicePoMonthlyBudget();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Service PO Monthly Budget"
        description="Manage monthly invoice and billed amounts for Service POs."
      />

      <CurrentMonthCard data={data} isLoading={isPending} onFillData={() => setModalOpen(true)} />

      <ServicePoMonthlyBudgetModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        month={data?.month}
        year={data?.year}
        servicePos={data?.service_pos}
      />
    </div>
  );
};

export default ServicePoMonthlyBudgetPage;
