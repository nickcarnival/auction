import { ReactNode } from 'react';
import { useSubdomainContext } from '../subdomain-provider';
import { getTenantDisplayTitle } from '@shared/tenant';

const OneDownFourUpLayout = ({ children }: { children: ReactNode }) => {
  const { subdomainContext, subDomain } = useSubdomainContext();

  return (
    <div
      className="flex flex-col w-full h-full
        font-merriweather bg-black
        "
    >
      <div
        className="w-full sticky flex justify-center md:justify-between bg-black
        bg-cover bg-center bg-no-repeat p-2 text-white
        "
      >
        {/* <img
                    className="w-24 md:w-48"
                    src="images/solowmain.png" alt="One Down Four Up Logo" /> */}

        <h1 className="text-2xl font-bold shadow-2xl">
          {getTenantDisplayTitle(subdomainContext?.tenant, subdomainContext?.tenantCode, subDomain)}
        </h1>

        {/* <div className="grow flex w-full items-start right-0 justify-between text-xl text-white">

                    <div className="flex items-center gap-1 font-bold"
                        aria-description="One Down Four Up Address"
                    >
                        <MapPinned />

                        <span>3615 W Bowles Ave, Littleton, CO 80123</span>
                    </div>

                    <button
                        type="button"
                        aria-description="Call One Down Four Up"
                        className="flex items-center cursor-pointer gap-1"
                        onClick={() => window.open('tel:3032371409')}
                    >
                        <Phone />
                        (303) 237-1409
                    </button>

                </div> */}
      </div>

      <div
        className="overflow-y-auto overflow-x-hidden w-full h-full md:px-24  mb-[100px] text-white
            "
      >
        {children}
      </div>
    </div>
  );
};

export default OneDownFourUpLayout;
