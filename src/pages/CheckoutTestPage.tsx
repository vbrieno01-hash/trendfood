import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import CheckoutPage from "@/components/checkout/CheckoutPage";

const mockItems = [
  { id: "1", name: "Hambúrguer Artesanal", price: 32.9, qty: 2 },
  { id: "2", name: "Refrigerante 600ml", price: 8.5, qty: 3 },
  { id: "3", name: "Batata Frita Grande", price: 18.0, qty: 1 },
  { id: "4", name: "Açaí 500ml", price: 22.0, qty: 1 },
];

export default function CheckoutTestPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  return (
    <CheckoutPage
      items={mockItems}
      onBack={() => navigate(-1)}
      onConfirm={(data) => {
        toast({ title: "Pedido confirmado!", description: `${data.name} — ${data.payment}` });
        console.log("Checkout data:", data);
      }}
    />
  );
}
