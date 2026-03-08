const hashPin = (pin: string): string => {
  let hash = 0;

  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return `pin_${Math.abs(hash).toString(36)}`;
};

export { hashPin };
