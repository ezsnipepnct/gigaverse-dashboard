'use client'

import { AbstractWalletProvider } from "@abstract-foundation/agw-react";
import { abstract } from "viem/chains"; // Abstract mainnet

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AbstractWalletProvider chain={abstract}>
      {children}
    </AbstractWalletProvider>
  );
} 