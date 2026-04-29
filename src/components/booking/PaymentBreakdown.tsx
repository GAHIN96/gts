import { Plus, Minus, CreditCard, Shield, CheckCircle2, Lock, Users } from "lucide-react";
import { motion } from "framer-motion";

interface BreakdownItem {
  label: string;
  amount: number;
  type: "addition" | "deduction";
  description?: string;
}

interface PaymentBreakdownProps {
  items: BreakdownItem[];
  passengerCount: number;
  grandTotal: number;
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: "easeOut" as const },
  }),
};

function CategoryHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-muted/40 border-b border-border/60">
      <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
        {label}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}

function LineRow({
  item,
  index,
  variant,
}: {
  item: BreakdownItem;
  index: number;
  variant: "addition" | "deduction";
}) {
  const isAdd = variant === "addition";
  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="show"
      className="grid grid-cols-3 gap-4 px-5 py-3.5 border-b border-border/60 hover:bg-muted/30 transition-colors"
    >
      <div className="min-w-0">
        <p className="font-semibold text-foreground text-sm truncate">{item.label}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        )}
      </div>
      <div className="flex items-center justify-center">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border ${
            isAdd
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
          }`}
        >
          {isAdd ? <Plus className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
          {isAdd ? "Addition" : "Savings"}
        </span>
      </div>
      <div className="text-right">
        <span
          className={`font-bold text-sm ${
            isAdd ? "text-primary" : "text-emerald-600"
          }`}
        >
          {isAdd ? "+" : "-"}${item.amount.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
}

export function PaymentBreakdown({
  items,
  passengerCount,
  grandTotal,
}: PaymentBreakdownProps) {
  const additions = items.filter((i) => i.type === "addition");
  const deductions = items.filter((i) => i.type === "deduction");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-3xl border border-border/40 shadow-card bg-card p-6 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-navy flex items-center justify-center shadow-md">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-heading text-xl font-bold text-foreground">
              Payment Summary
            </h3>
            <p className="text-xs text-muted-foreground tracking-wide">
              Complete breakdown of your booking
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] uppercase tracking-[0.16em] font-bold">
          <Lock className="h-3 w-3" />
          Verified
        </span>
      </div>

      {/* Breakdown card */}
      <div className="rounded-2xl border border-border/60 overflow-hidden bg-background/50">
        {/* Glass header strip */}
        <div className="grid grid-cols-3 gap-4 px-5 py-3 bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 border-b border-border/60 text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
          <span>Item</span>
          <span className="text-center">Type</span>
          <span className="text-right">Amount</span>
        </div>

        {additions.length > 0 && (
          <>
            <CategoryHeader label="Additions" />
            {additions.map((item, i) => (
              <LineRow key={`add-${i}`} item={item} index={i} variant="addition" />
            ))}
          </>
        )}

        {deductions.length > 0 && (
          <>
            <CategoryHeader label="Savings" />
            {deductions.map((item, i) => (
              <LineRow key={`ded-${i}`} item={item} index={i} variant="deduction" />
            ))}
          </>
        )}

        {/* Passenger multiplier */}
        <CategoryHeader label="Subtotal" />
        <div className="grid grid-cols-3 gap-4 px-5 py-3.5 bg-muted/20">
          <div>
            <p className="font-semibold text-foreground text-sm">
              Number of Passengers
            </p>
            <p className="text-xs text-muted-foreground">Multiplier applied</p>
          </div>
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-foreground/5 border border-border text-foreground text-xs font-bold">
              <Users className="h-3 w-3" />×{passengerCount}
            </span>
          </div>
          <div className="text-right">
            <span className="font-semibold text-foreground text-sm">
              {passengerCount} {passengerCount === 1 ? "traveler" : "travelers"}
            </span>
          </div>
        </div>

        {/* Grand total — gradient brand strip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent via-primary to-primary" />
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative px-5 py-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white/70">
                Grand Total
              </p>
              <p
                className="text-3xl font-extrabold text-white tracking-tight"
                style={{ textShadow: "0 0 24px hsl(0 0% 100% / 0.3)" }}
              >
                ${grandTotal.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-white text-[10px] uppercase tracking-wider font-semibold mb-1">
                All taxes included
              </span>
              <p className="text-sm font-semibold text-white/90">
                ${(grandTotal / passengerCount).toLocaleString()}
                <span className="text-white/60 text-xs font-normal"> /person</span>
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Trust badges — chip style */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {[
          { icon: Lock, label: "256-bit SSL" },
          { icon: Shield, label: "PCI Compliant" },
          { icon: CheckCircle2, label: "Money-back" },
        ].map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/60 text-xs font-medium text-muted-foreground"
          >
            <Icon className="h-3.5 w-3.5 text-emerald-600" />
            {label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
