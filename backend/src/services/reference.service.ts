import prisma from '../config/database';

export const generateSequentialReference = async (
  prefixType: 'HD' | 'WR' | 'MD' | 'WIG'
): Promise<string> => {
  const currentYear = new Date().getFullYear();
  // Format: "HD 2026-0001" — space between type and year, hyphen before sequence
  const prefix = `${prefixType} ${currentYear}-`;

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
  } else if (prefixType === 'WIG') {
    lastRecord = await prisma.wigProduction.findFirst({
      where: { taskCode: { startsWith: prefix } },
      orderBy: { id: 'desc' }
    });
  }

  let nextSeq = 1;
  const refString = lastRecord?.reference || lastRecord?.referenceNumber || lastRecord?.taskCode;
  if (refString) {
    // "HD 2026-0042" — last segment after the final hyphen is the sequence
    const lastHyphen = refString.lastIndexOf('-');
    if (lastHyphen !== -1) {
      const parsedSeq = parseInt(refString.slice(lastHyphen + 1), 10);
      if (!isNaN(parsedSeq)) {
        nextSeq = parsedSeq + 1;
      }
    }
  }

  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
};
