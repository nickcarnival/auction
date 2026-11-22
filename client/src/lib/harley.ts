interface Motorcycle {
  id: string;
  make: string;
  vin: string;
  manufacturerId: string;
  manufacturer: Manufacturer;
  weightClassId: string;
  weightClass: string;
  modelCode: string;
  model: Model;
  year: number;
  engineCode: string;
  introductionPeriod: string;
  vinCheckDigit: string;
  modelYearCode: string;
  assemblyPlantCode: string;
  productionNumber: string;
}

// the first 3 digits specified the world manufacturer ID
// the fourth digit specified the weight class ID
// the fifth the sixth characters specified the model code
// the seventh character specified the engine code
// the eighth character specified the introduction period
// the ninth character specified the VIN check digit
// the tenth character specified the model year code
// the eleventh character specified the assembly plant code
// the final 6 characters specified the production number

export const vinDecoder = (vin: string): Motorcycle => {
  if (vin.length !== 17) {
    throw new Error('Invalid VIN length');
  }

  const manufacturer = getManufacturer(vin);
  const weightClass = getWeightClass(vin);
  const modelYear = getModelYear(vin);
  const model = getModel(vin);

  return {
    manufacturer,
    manufacturerId: vin.substring(0, 3),
    weightClassId: vin[3],
    weightClass,
    year: modelYear,
    model,
    modelYearCode: vin[9],
  } as Motorcycle;
};

type Manufacturer = 'Within United States' | 'Outside United States' | 'Brazil' | 'India';

const getManufacturer = (vin: string): Manufacturer => {
  // manufactuer id:
  // 1HD	Manufactured for sale within the United States
  // 5HD	Manufactured for sale outside of the United States
  // 932	Manufactured in and for sale only in Brazil
  // MEG	Manufactured in and for sale only in India

  const manufacturerId = vin.substring(0, 3);
  switch (manufacturerId) {
    case '1HD':
      return 'Within United States';
    case '5HD':
      return 'Outside United States';
    case '932':
      return 'Brazil';
    case 'MEG':
      return 'Brazil';
    default:
      throw new Error('Unknown manufacturer ID');
  }
};

// 1	Heavyweight (≥ 901 cc)
// 4	Lightweight (≤ 900 cc)
// 8	Sidecar

type WeightClass = 'Heavyweight' | 'Lightweight' | 'Sidecar';

const getWeightClass = (vin: string): WeightClass => {
  const weightClassId = vin[3];
  switch (weightClassId) {
    case '1':
      return 'Heavyweight';
    case '4':
      return 'Lightweight';
    case '8':
      return 'Sidecar';
    default:
      throw new Error('Unknown weight class ID');
  }
};

type Model = {
  topLevelModel: string;
  subModel: string;
};

const getModel = (vin: string): Model => {
  const modelId = vin.slice(0, 2);

  switch (modelId) {
    case 'AA':
      return { topLevelModel: 'FL Touring', subModel: 'FLH' };
    case 'AB':
      return { topLevelModel: 'FL Touring', subModel: 'FLHP' };
    case 'AC':
      return { topLevelModel: 'FL Touring', subModel: 'FLH' };
    case 'AD':
      return { topLevelModel: 'FL Touring', subModel: 'FLH - Classic' };
    case 'AE':
      return { topLevelModel: 'FL Touring', subModel: 'FLT' };
    case 'AF':
      return { topLevelModel: 'FL Touring', subModel: 'FLTC' };
    case 'AH':
      return { topLevelModel: 'FL Touring', subModel: 'FLHP - Deluxe' };
    case 'AJ':
      return { topLevelModel: 'FL Touring', subModel: 'FLH - Heritage' };
    case 'AK':
      return { topLevelModel: 'FL Touring', subModel: 'FLHS' };
    case 'AL':
      return { topLevelModel: 'FL Touring', subModel: 'FLH - Shrine' };
    case 'BA':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXE' };
    case 'BB':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXEF, FXSTDI' };
    case 'BC':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXS' };
    case 'BD':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXB' };
    case 'BE':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXWG' };
    case 'BF':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXSB' };
    case 'BG':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDG' };
    case 'BH':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXST' };
    case 'BJ':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLST, FLSTC' };
    case 'BK':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXSTC' };
    case 'BL':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXSTS' };
    case 'BM':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLSTF' };
    case 'BN':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLSTN' };
    case 'BP':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXSTSB' };
    case 'BR':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLSTS' };
    case 'BS':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXSTD' };
    case 'BT':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXSTB' };
    case 'BV':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXST' };
    case 'BW':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLSTC' };
    case 'BX':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLSTF' };
    case 'BY':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLSTC' };
    case 'BZ':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXSTSI' };
    case 'CA':
      return { topLevelModel: 'XL Sportster', subModel: 'XLH' };
    case 'CB':
      return { topLevelModel: 'XL Sportster', subModel: 'XLS' };
    case 'CC':
      return { topLevelModel: 'XL Sportster', subModel: 'XLX' };
    case 'CD':
      return { topLevelModel: 'XL Sportster', subModel: 'XR-1000' };
    case 'CE':
      return { topLevelModel: 'XL Sportster', subModel: 'XL 883H' };
    case 'CF':
      return { topLevelModel: 'XL Sportster', subModel: 'XL 883 Deluxe' };
    case 'CG':
      return { topLevelModel: 'XL Sportster', subModel: 'XL 1200C' };
    case 'CH':
      return { topLevelModel: 'XL Sportster', subModel: 'XL 1200S' };
    case 'CJ':
      return { topLevelModel: 'XL Sportster', subModel: 'XL 883C' };
    case 'CK':
      return { topLevelModel: 'XL Sportster', subModel: 'XL 883R' };
    case 'CM':
      return { topLevelModel: 'XL Sportster', subModel: 'XL883L' };
    case 'CN':
      return { topLevelModel: 'XL Sportster', subModel: 'XL883' };
    case 'CP':
      return { topLevelModel: 'XL Sportster', subModel: 'XL883C' };
    case 'CR':
      return { topLevelModel: 'XL Sportster', subModel: 'XL883L' };
    case 'CS':
      return { topLevelModel: 'XL Sportster', subModel: 'XL883R' };
    case 'CT':
      return { topLevelModel: 'XL Sportster', subModel: 'XL1200C' };
    case 'CV':
      return { topLevelModel: 'XL Sportster', subModel: 'XL1200R' };
    case 'CW':
      return { topLevelModel: 'XL Sportster', subModel: 'XL1200L' };
    case 'CX':
      return { topLevelModel: 'XL Sportster', subModel: 'XL1200L' };
    case 'CY':
      return { topLevelModel: 'XL Sportster', subModel: 'XL50' };
    case 'CZ':
      return { topLevelModel: 'XL Sportster', subModel: 'XL1200N' };
    case 'DA':
      return { topLevelModel: 'FL Touring', subModel: 'FLT, FLHTP' };
    case 'DB':
      return { topLevelModel: 'FL Touring', subModel: 'FLTC' };
    case 'DC':
      return { topLevelModel: 'FL Touring', subModel: 'FLHT' };
    case 'DD':
      return { topLevelModel: 'FL Touring', subModel: 'FLHT' };
    case 'DE':
      return { topLevelModel: 'FL Touring', subModel: 'FLHTC' };
    case 'DF':
      return { topLevelModel: 'FL Touring', subModel: 'FLHTP' };
    case 'DG':
      return { topLevelModel: 'FL Touring', subModel: 'FLHTC Shrine' };
    case 'DH':
      return { topLevelModel: 'FL Touring', subModel: 'FLTC' };
    case 'DJ':
      return { topLevelModel: 'FL Touring', subModel: 'FLHTC' };
    case 'DK':
      return { topLevelModel: 'FL Touring', subModel: 'FLTC Shrine' };
    case 'DM':
      return { topLevelModel: 'FL Touring', subModel: 'FLTCU - Ultra' };
    case 'DN':
      return { topLevelModel: 'FL Touring', subModel: 'FLTCU - Ultra' };
    case 'DP':
      return { topLevelModel: 'FL Touring', subModel: 'FLHTC' };
    case 'DS':
      return { topLevelModel: 'FL Touring', subModel: 'FLTCU - Ultra Shrine' };
    case 'DT':
      return { topLevelModel: 'FL Touring', subModel: 'FLHTCU - Ultra Shrine' };
    case 'EA':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXR' };
    case 'EB':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXRS' };
    case 'EC':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXRT' };
    case 'ED':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXRP - Windshield' };
    case 'EE':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXRDG' };
    case 'EF':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXRP - Fairing' };
    case 'EG':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXRS-SP Sport Edition' };
    case 'EH':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXRD' };
    case 'EJ':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXRC' };
    case 'EK':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXRP - C.H.P.' };
    case 'EL':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXLR' };
    case 'EM':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXRS – CON' };
    case 'ES':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXR' };
    case 'ET':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXR' };
    case 'EV':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXR' };
    case 'FA':
      return { topLevelModel: 'FL Touring', subModel: 'FLHRS, FLHS' };
    case 'FB':
      return { topLevelModel: 'FL Touring', subModel: 'FLHRI, FLHR' };
    case 'FC':
      return { topLevelModel: 'FL Touring', subModel: 'FLHTCUI, FLHTCU' };
    case 'FD':
      return { topLevelModel: 'FL Touring', subModel: 'FLHR' };
    case 'FE':
      return { topLevelModel: 'FL Touring', subModel: 'FLTCUI' };
    case 'FF':
      return { topLevelModel: 'FL Touring', subModel: 'FLHTCI, FLHTC' };
    case 'FG':
      return { topLevelModel: 'FL Touring', subModel: 'FLHTCUI' };
    case 'FH':
      return { topLevelModel: 'FL Touring', subModel: 'FLHPI' };
    case 'FL':
      return { topLevelModel: 'FL Touring', subModel: 'FLHTCUI, FLHTCU' };
    case 'FM':
      return { topLevelModel: 'FL Touring', subModel: 'FLHTPI' };
    case 'FP':
      return { topLevelModel: 'FL Touring', subModel: 'FLTR' };
    case 'FR':
      return { topLevelModel: 'FL Touring', subModel: 'FLHRCI, FLHRC' };
    case 'FS':
      return { topLevelModel: 'FL Touring', subModel: 'FLTRI' };
    case 'FT':
      return { topLevelModel: 'FL Touring', subModel: 'FLHPEI' };
    case 'FW':
      return { topLevelModel: 'FL Touring', subModel: 'FLHR Shrine' };
    case 'GA':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDB-D Daytona' };
    case 'GB':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDB-S Sturgis' };
    case 'GC':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDC' };
    case 'GD':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDL' };
    case 'GE':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDWG' };
    case 'GG':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDS-CON' };
    case 'GH':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXD' };
    case 'GJ':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDX' };
    case 'GK':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDP' };
    case 'GL':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDXT' };
    case 'GM':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDI' };
    case 'GN':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDL' };
    case 'GP':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDWG' };
    case 'GR':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDXI' };
    case 'GT':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDC' };
    case 'GV':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDC' };
    case 'GX':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'TL' };
    case 'GY':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDF' };
    case 'GZ':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FLD' };
    case 'HA':
      return { topLevelModel: 'V-ROD', subModel: 'VRSCA' };
    case 'HC':
      return { topLevelModel: 'V-ROD', subModel: 'VRSCR' };
    case 'HD':
      return { topLevelModel: 'V-ROD', subModel: 'VRSCD' };
    case 'HF':
      return { topLevelModel: 'V-ROD', subModel: 'VRSCA' };
    case 'HH':
      return { topLevelModel: 'V-ROD', subModel: 'VRSCDX' };
    case 'HJ':
      return { topLevelModel: 'V-ROD', subModel: 'VRSCX' };
    case 'HP':
      return { topLevelModel: 'V-ROD', subModel: 'VRSCF' };
    case 'JA':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXSTB' };
    case 'JB':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXSTDI' };
    case 'JD':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLSTN' };
    case 'JE':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLST' };
    case 'JF':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLSTI' };
    case 'JG':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLSTF' };
    case 'JH':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLSTC' };
    case 'JJ':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXCW' };
    case 'JK':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXCWC' };
    case 'JL':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXSTC' };
    case 'JM':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLSTSB' };
    case 'JN':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLSTFB' };
    case 'JP':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXS' };
    case 'JR':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLS' };
    case 'JT':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLSTFBS' };
    case 'KA':
      return { topLevelModel: 'FL Touring', subModel: 'FLHX' };
    case 'KB':
      return { topLevelModel: 'FL Touring', subModel: 'FLHX' };
    case 'KE':
      return { topLevelModel: 'FL Touring', subModel: 'FLHTK' };
    case 'KG':
      return { topLevelModel: 'FL Touring', subModel: 'FLTRU' };
    case 'KH':
      return { topLevelModel: 'FL Touring', subModel: 'FLTRX' };
    case 'KX':
      return { topLevelModel: 'FL Touring', subModel: 'SIDECAR TLE ULTRA' };
    case 'LA':
      return { topLevelModel: 'XL Sportster', subModel: 'XR1200' };
    case 'LC':
      return { topLevelModel: 'XL Sportster', subModel: 'XL1200X' };
    case 'LD':
      return { topLevelModel: 'XL Sportster', subModel: 'XR1200X' };
    case 'LE':
      return { topLevelModel: 'XL Sportster', subModel: 'XL883N' };
    case 'LF':
      return { topLevelModel: 'XL Sportster', subModel: 'XL1200V' };
    case 'LH':
      return { topLevelModel: 'XL Sportster', subModel: 'XL1200CP' };
    case 'LJ':
      return { topLevelModel: 'XL Sportster', subModel: 'XL1200CA' };
    case 'LK':
      return { topLevelModel: 'XL Sportster', subModel: 'XL1200CB' };
    case 'MA':
      return { topLevelModel: 'FL Touring', subModel: 'FLHTCUTG - Trike' };
    case 'MB':
      return { topLevelModel: 'FL Touring', subModel: 'Trike' };
    case 'MC':
      return { topLevelModel: 'FL Touring', subModel: 'FLRT' };
    case 'NA':
      return { topLevelModel: 'Street', subModel: 'XG500' };
    case 'NB':
      return { topLevelModel: 'Street', subModel: 'XG750' };
    case 'PB':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDWG' };
    case 'PE':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDWG3' };
    case 'PF':
      return { topLevelModel: 'FL Touring', subModel: 'FLSTDSE' };
    case 'PF':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXSTDSE' };
    case 'PG':
      return { topLevelModel: 'FL Touring', subModel: 'FLHRSEI2' };
    case 'PH':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXSTDSE' };
    case 'PL':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLSTFSE' };
    case 'PN':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLSTFSE' };
    case 'PR':
      return { topLevelModel: 'FL Touring', subModel: 'FLHTCUSE7 - CVO' };
    case 'PS':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDSE' };
    case 'PT':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FXSTSSE' };
    case 'PX':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FSDFSE' };
    case 'PY':
      return { topLevelModel: 'FL Touring', subModel: 'FLSTSE3 - CVO' };
    case 'PY':
      return { topLevelModel: 'FL/FX Softail', subModel: 'FLSTSE' };
    case 'PZ':
      return { topLevelModel: 'FL Touring', subModel: 'FLHXSE - CVO' };
    case 'VA':
      return { topLevelModel: 'FX/FL Dyna Glide', subModel: 'FXDBP' };

    default:
      throw new Error('Unknown model ID');
  }
};

// This is going to be a pain in the ass :)
const getModelYear = (vin: string): number => {
  const yearCode = vin[9];
  switch (yearCode) {
    case 'A':
      return 2010;
    case 'B':
      // 2011
      return 1981;
    case 'C':
      // 2012
      return 1982;
    case 'D':
      // 2013
      return 1983;
    case 'E':
      // 2014
      return 1984;
    case 'F':
      // 2015
      return 1985;
    case 'G':
      // 2016
      return 1986;
    case 'H':
      // 2017
      return 1987;
    case 'J':
      // 2018
      return 1988;
    case 'K':
      // 2019
      return 1989;
    case 'L':
      // 2020
      return 1990;
    case 'M':
      // 2021
      return 1991;
    case 'N':
      // 2022
      return 1992;
    case 'P':
      // 2023
      return 1993;
    case 'R':
      // 2024
      return 1994;
    case 'S':
      // 2025
      return 1995;
    case 'T':
      return 1996;
    case 'V':
      return 1997;
    case 'W':
      return 1998;
    case 'X':
      return 1999;
    case 'Y':
      return 2000;
    case '1':
      return 2001;
    case '2':
      return 2002;
    case '3':
      return 2003;
    case '4':
      return 2004;
    case '5':
      return 2005;
    case '6':
      return 2006;
    case '7':
      return 2007;
    case '8':
      return 2008;
    case '9':
      return 2009;
    default:
      throw new Error('Unknown model year code');
  }
};
