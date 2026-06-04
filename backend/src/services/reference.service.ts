import prisma from '../config/database';

export const generateSequentialReference = async (
  prefixType: 'HD' | 'WR' | 'MD' | 'WB'
): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `${prefixType} ${currentYear}-`;

  let records: Array<{ reference?: string | null; referenceNumber?: string | null; taskCode?: string | null }> = [];

  if (prefixType === 'HD') {
    records = await prisma.donation.findMany({
      where: { reference: { startsWith: prefix } },
      select: { reference: true },
    });
  } else if (prefixType === 'WR') {
    records = await prisma.hairRequest.findMany({
      where: { reference: { startsWith: prefix } },
      select: { reference: true },
    });
  } else if (prefixType === 'MD') {
    records = await prisma.monetaryDonation.findMany({
      where: { referenceNumber: { startsWith: prefix } },
      select: { referenceNumber: true },
    });
  } else if (prefixType === 'WB') {
    // Count both WB and WIG parent batches (not child wigs) to avoid sequence collisions
    const [wbRecs, wigRecs] = await Promise.all([
      prisma.wigProduction.findMany({
        where: { taskCode: { startsWith: `WB ${currentYear}-` }, NOT: { taskCode: { contains: '-W' } } },
        select: { taskCode: true },
      }),
      prisma.wigProduction.findMany({
        where: { taskCode: { startsWith: `WIG ${currentYear}-` }, NOT: { taskCode: { contains: '-W' } } },
        select: { taskCode: true },
      }),
    ]);
    records = [...wbRecs, ...wigRecs];
  }

  let maxSeq = 0;
  for (const record of records) {
    const refString = record.reference || record.referenceNumber || record.taskCode;
    if (!refString) continue;

    const lastHyphen = refString.lastIndexOf('-');
    if (lastHyphen === -1) continue;

    const seqText = refString.slice(lastHyphen + 1);
    if (/^\d+$/.test(seqText)) {
      maxSeq = Math.max(maxSeq, parseInt(seqText, 10));
    }
  }

  return `${prefix}${(maxSeq + 1).toString().padStart(4, '0')}`;
};
