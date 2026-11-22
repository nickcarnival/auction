import { MapPinned, Phone } from 'lucide-react';
import { ReactNode } from 'react';
import { useSubdomainContext } from '../subdomain-provider';
import { getTenantDisplayTitle } from '@shared/tenant';

const SolowLayout = ({ children }: { children: ReactNode }) => {
  const { subdomainContext, subDomain } = useSubdomainContext();

  return (
    <div
      className="flex flex-col w-full h-full
        font-merriweather bg-black
        "
    >
      <div
        className="w-full flex justify-between md:flex-col md:justify-center items-center bg-black
        bg-cover bg-center bg-no-repeat p-2
        "
      >
        <img className="w-20 md:w-48" src="images/solowmain.png" alt="SoLow Cycles Logo" />

        <div className="flex flex-col text-xl text-[#e93d3d]">
          <h1 className="md:hidden text-2xl font-bold shadow-2xl text-[#e93d3d]">
            {getTenantDisplayTitle(subdomainContext?.tenant, subdomainContext?.tenantCode, subDomain)}
          </h1>

          <div className="flex-col items-end text-xs justify-start text-stone-400">
            <div
              className="flex items-center gap-1 font-bold"
              aria-description="SoLow Cycles Address"
            >
              <MapPinned />

              <span>Denver, CO 80223</span>
            </div>

            <button
              type="button"
              aria-description="Call SoLow Cycles"
              className="flex items-center cursor-pointer gap-1"
              onClick={() => window.open('tel:7209030469')}
            >
              <Phone />
              (720)-903-0469
            </button>
          </div>
        </div>
      </div>

      <div
        className="overflow-y-auto overflow-x-hidden w-full h-full md:px-24  text-[#e93d3d]
            "
      >
        {children}
      </div>
    </div>
  );
};

export default SolowLayout;
