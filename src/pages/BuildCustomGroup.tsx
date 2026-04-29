import { CustomGroupBuilder } from "@/components/booking/CustomGroupBuilder";
import { motion } from "framer-motion";

const BuildCustomGroup = () => {
  return (
    <motion.div 
      className="w-full pb-8 min-h-screen bg-transparent -m-4 p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <CustomGroupBuilder />
    </motion.div>
  );
};

export default BuildCustomGroup;
