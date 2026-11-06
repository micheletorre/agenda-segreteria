import React, { useState } from 'react';
import { X, Lock, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPin: string;
}

export const PinModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  correctPin,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        if (nextPin === correctPin) {
          setError(false);
          setPin('');
          onSuccess();
          onClose();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 800);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl max-w-xs w-full p-6 text-center">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
            <Lock size={20} />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer -mr-2 -mt-2"
          >
            <X size={18} />
          </button>
        </div>

        <h3 className="text-base font-bold text-white mb-1">
          Accesso Riservato Segreteria
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          Inserisci il PIN per abilitare le modifiche e la gestione completa da smartphone
        </p>

        {/* Display PIN con 4 pallini */}
        <div className="flex justify-center items-center gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => {
            const isFilled = pin.length > i;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  error
                    ? 'border-red-500 bg-red-500/40 animate-shake'
                    : isFilled
                    ? 'border-amber-400 bg-amber-400 scale-110 shadow-xs'
                    : 'border-slate-600 bg-slate-800'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="text-xs text-red-400 mb-4 flex items-center justify-center gap-1 font-semibold animate-in fade-in">
            <AlertCircle size={13} /> PIN errato, riprova
          </div>
        )}

        {/* Tastierino Numerico Touch Rapido */}
        <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-lg font-bold text-white transition cursor-pointer shadow-xs"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-lg font-bold text-white transition cursor-pointer shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer flex items-center justify-center"
          >
            Canc
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer font-medium"
        >
          Annulla e resta in Sola Lettura
        </button>

      </div>
    </div>
  );
};
