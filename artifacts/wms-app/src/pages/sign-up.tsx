import { SignUp } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <img
            src={`${basePath}/logo.svg`}
            alt="WareIQ"
            className="w-14 h-14 mx-auto mb-3"
          />
          <h1 className="text-2xl font-bold text-[#0F2540] tracking-tight">WareIQ</h1>
          <p className="text-sm text-[#68778d] mt-1">Create your account to get started</p>
        </div>
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
        />
      </div>
    </div>
  );
}
