import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState("Authenticating...");

    const effectRan = useRef(false);

   useEffect(() => {
    if (effectRan.current) return;
    effectRan.current = true;

    const handleAuthLogic = async () => {

        console.log("🔥 AuthCallback START");

        // 1. GET SESSION
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            console.error("❌ Auth Error:", error);
            navigate("/login?error=auth_failed");
            return;
        }

        console.log("✅ SESSION:", session);

        // -------------------------------------------------
        // 🔥 2. EXTRACT REFRESH TOKEN (MOST IMPORTANT)
        // -------------------------------------------------
        const refreshToken = session.provider_refresh_token;

        console.log("🔥 REFRESH TOKEN:", refreshToken);

        if (!refreshToken) {
            alert("❌ No refresh token — FIX GOOGLE OAUTH");
            return;
        }

        // -------------------------------------------------
        // 🔥 3. SAVE TOKEN TO DB
        // -------------------------------------------------
        await supabase
            .from("profiles")
            .update({
                google_token: { refresh_token: refreshToken }
            })
            .eq("id", session.user.id);

        console.log("✅ Token saved to DB");

        // -------------------------------------------------
        // 🔥 4. NOW DO YOUR NORMAL LOGIC
        // -------------------------------------------------
        const { data, error: rpcError } = await supabase.rpc('get_user_status_by_email');

        if (rpcError || !data?.success) {
            await supabase.auth.signOut();
            navigate("/login?error=account_not_found");
            return;
        }

        const userStatus = data.status || "NEW";

        // -------------------------------------------------
        // 🔥 5. REDIRECT (AFTER EVERYTHING)
        // -------------------------------------------------
        if (userStatus === "ACTIVE" || userStatus === "AWAITING_FOLDERS") {
            navigate("/dashboard");
        }
        else if (["CONNECTED", "AWAITING_SYLLABUS", "EDITING_LIST"].includes(userStatus)) {
            navigate("/setup");
        }
        else {
            navigate("/verify");
        }
    };

    handleAuthLogic();
}, []);

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#020202] text-white font-mono">
            <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
            <h2 className="text-xl font-bold">{status}</h2>
        </div>
    );
}