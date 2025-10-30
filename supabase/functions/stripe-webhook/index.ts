import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

serve(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");
  
  if (!signature) {
    console.error("No Stripe signature found");
    return new Response(JSON.stringify({ error: "No signature" }), { status: 400 });
  }

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;

    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    console.log("Webhook event received:", event.type);

    // Handle successful payment
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const bookId = session.metadata?.bookId;
      const userId = session.metadata?.userId;
      const paymentIntentId = session.payment_intent as string;

      console.log("Processing purchase:", { bookId, userId, paymentIntentId });

      if (bookId && userId) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get book details
        const { data: book, error: bookError } = await supabase
          .from("books")
          .select("price")
          .eq("id", bookId)
          .single();

        if (bookError) {
          console.error("Error fetching book:", bookError);
          throw bookError;
        }

        // Record the purchase
        const { error: purchaseError } = await supabase
          .from("purchases")
          .insert({
            user_id: userId,
            book_id: bookId,
            amount: book.price,
            stripe_payment_intent_id: paymentIntentId,
          });

        if (purchaseError) {
          console.error("Error recording purchase:", purchaseError);
          throw purchaseError;
        }

        console.log("Purchase recorded successfully");
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
