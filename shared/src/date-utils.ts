const FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';

const roundDuration = (duration: number) => {
  return Math.round(duration * 10) / 10;
};

export { FORMAT, roundDuration };
