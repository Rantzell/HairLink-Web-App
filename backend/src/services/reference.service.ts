import prisma from '../config/database';

export const generateSequentialReference = async (
  prefixType: 'HD' | 'WR' | 'MD'
): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `${prefixType}-${currentYear}-`;
  
  let lastRecord: any = null;
  
  if (prefixType === 'HD') {
    lastRecord = await prisma.donation.findFirst({
      where: { reference: { startsWith: prefix } },
      orderBy: { id: 'desc' }
    });
  } else if (prefixType === 'WR') {
    lastRecord = await prisma.hairRequest.findFirst({
      where: { reference: { startsWith: prefix } },
      orderBy: { id: 'desc' }
    });
  } else if (prefixType === 'MD') {
    lastRecord = await prisma.monetaryDonation.findFirst({
      where: { referenceNumber: { startsWith: prefix } },
      orderBy: { id: 'desc' }
    });
  }

  let nextSeq = 1;
  const refString = lastRecord?.reference || lastRecord?.referenceNumber;
  if (refString) {
    const parts = refString.split('-');
    if (parts.length === 3) {
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq)) {
        nextSeq = parsedSeq + 1;
      }
    }
  }

  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
};
