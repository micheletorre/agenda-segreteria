import React from 'react';
import { Building2, ArrowRight } from 'lucide-react';

interface IconProps {
  size?: number;
  className?: string;
}

/**
 * Icona per appuntamenti IN SEDE (AU Riceve):
 * Mostra il palazzo di sede direzionale.
 */
export const InSedeIcon: React.FC<IconProps> = ({ 
  size = 15, 
  className = 'text-red-600' 
}) => {
  return (
    <Building2 
      size={size} 
      className={`${className} shrink-0 inline self-center print:hidden`} 
      title="In Sede (Riceve)" 
    />
  );
};

/**
 * Icona per appuntamenti ESTERNI / USCITE (AU Fuori Sede):
 * Mostra lo stesso palazzo di sede affiancato da una freccia di uscita in evidenza.
 */
export const UscitaIcon: React.FC<IconProps> = ({ 
  size = 15, 
  className = 'text-amber-900' 
}) => {
  return (
    <span 
      className="inline-flex items-center gap-0.5 shrink-0 self-center print:hidden font-black" 
      title="Uscita / Fuori Sede"
    >
      <Building2 size={size} className={className} />
      <ArrowRight size={Math.max(11, size - 2)} className={`${className} stroke-[2.75]`} />
    </span>
  );
};
