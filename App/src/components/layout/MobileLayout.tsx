import React from 'react';

export const MobileLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="fixed inset-0 bg-gray-900 flex justify-center overflow-hidden">
      {/* Container limitador estilo Smartphone */}
      <div className="w-full max-w-[430px] h-full bg-white relative shadow-2xl flex flex-col overflow-x-hidden overflow-y-auto">
        {children}
      </div>
    </div>
  );
};
