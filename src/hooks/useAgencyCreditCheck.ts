import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CreditCheckResult {
  hasCredit: boolean;
  creditLimit: number;
  usedCredit: number;
  availableCredit: number;
  limitType: "soft" | "hard";
  isHardLimitExceeded: boolean;
  agencyId: string | null;
  agencyName: string | null;
}

export function useAgencyCreditCheck(amount: number) {
  return useQuery({
    queryKey: ["agency-credit-check", amount],
    queryFn: async (): Promise<CreditCheckResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          hasCredit: true,
          creditLimit: 0,
          usedCredit: 0,
          availableCredit: 0,
          limitType: "soft",
          isHardLimitExceeded: false,
          agencyId: null,
          agencyName: null,
        };
      }

      const { data: agency, error } = await supabase
        .from("agencies")
        .select("id, agency_name, credit_limit, used_credit, credit_limit_type")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !agency) {
        // Not an agency user, no credit limits
        return {
          hasCredit: true,
          creditLimit: 0,
          usedCredit: 0,
          availableCredit: 0,
          limitType: "soft",
          isHardLimitExceeded: false,
          agencyId: null,
          agencyName: null,
        };
      }

      const creditLimit = Number(agency.credit_limit) || 0;
      const usedCredit = Number(agency.used_credit) || 0;
      const limitType = (agency.credit_limit_type || "soft") as "soft" | "hard";
      const availableCredit = Math.max(0, creditLimit - usedCredit);
      
      // If no credit limit is set (0), allow unlimited
      if (creditLimit === 0) {
        return {
          hasCredit: true,
          creditLimit: 0,
          usedCredit: 0,
          availableCredit: Infinity,
          limitType,
          isHardLimitExceeded: false,
          agencyId: agency.id,
          agencyName: agency.agency_name,
        };
      }

      const wouldExceed = (usedCredit + amount) > creditLimit;
      const isHardLimitExceeded = limitType === "hard" && wouldExceed;

      return {
        hasCredit: !isHardLimitExceeded,
        creditLimit,
        usedCredit,
        availableCredit,
        limitType,
        isHardLimitExceeded,
        agencyId: agency.id,
        agencyName: agency.agency_name,
      };
    },
    enabled: amount > 0,
  });
}

export function useUpdateAgencyUsedCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agencyId, newUsedCredit }: { agencyId: string; newUsedCredit: number }) => {
      const { error } = await supabase
        .from("agencies")
        .update({ used_credit: newUsedCredit })
        .eq("id", agencyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      queryClient.invalidateQueries({ queryKey: ["agency-credit-check"] });
    },
  });
}

export function useRecordCreditTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agencyId,
      amount,
      transactionType,
      description,
      bookingId,
      balanceAfter,
    }: {
      agencyId: string;
      amount: number;
      transactionType: "booking" | "payment" | "adjustment" | "refund";
      description?: string;
      bookingId?: string;
      balanceAfter: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("agency_credit_transactions")
        .insert({
          agency_id: agencyId,
          amount,
          transaction_type: transactionType,
          description,
          booking_id: bookingId,
          balance_after: balanceAfter,
          created_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
    },
  });
}
