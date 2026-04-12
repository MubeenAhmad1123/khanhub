const fs = require('fs');
let c = fs.readFileSync('apps/web/src/app/hq/dashboard/cashier/page.tsx', 'utf8');

c = c.replace(
  /let rehabRows: any\[\] = \[\];[\s\S]*?unsubRehab\(\);\s*unsubSpims\(\);\s*\};/m,
  `let rowsMap: Record<string, any[]> = {};
      DEPARTMENTS.forEach(d => rowsMap[d.txCollection] = []);

      const merge = () => {
        const allTx = DEPARTMENTS.flatMap((dept) =>
          rowsMap[dept.txCollection].map((tx: any) => ({ ...tx, _txCollection: dept.txCollection }))
        );
        const visible = allTx.filter((tx: any) => {
          const txCashier = String(tx.cashierId || '').trim();
          if (!txCashier) return true;
          return txCashier.toUpperCase() === cashierCustomId;
        });
        const createdMs = (row: any) => {
          const c = row.createdAt;
          if (!c) return 0;
          if (typeof c.toMillis === 'function') return c.toMillis();
          if (typeof c.seconds === 'number') return c.seconds * 1000;
          return 0;
        };
        visible.sort((a: any, b: any) => createdMs(b) - createdMs(a));
        setIncomingFeeReqs(visible);
        setIncomingLoading(false);
      };

      const onErr = (err: unknown) => {
        console.error('[HQ Cashier] subscribeIncoming error:', err);
        setIncomingError(
          \`\${(err as any)?.code || 'error'}: \${(err as any)?.message || 'Failed to load incoming requests.'}\`
        );
        setIncomingLoading(false);
      };

      const unsubs = DEPARTMENTS.map(dept => {
        const qDept = query(
          collection(db, dept.txCollection),
          where('status', '==', 'pending_cashier'),
          orderBy('createdAt', 'desc')
        );
        return onSnapshot(
          qDept,
          (snap) => {
            rowsMap[dept.txCollection] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            merge();
          },
          onErr
        );
      });

      return () => {
        unsubs.forEach(u => u());
      };`
);

c = c.replace(
  /const col =\s*rejectModalTx\._txCollection \|\|\s*\(String\(rejectModalTx\.departmentCode \|\| ''\)\.toLowerCase\(\) === 'spims'\s*\?\s*'spims_transactions'\s*:\s*'rehab_transactions'\);/,
  `const dCode = String(rejectModalTx.departmentCode || '').toLowerCase();
      const col = rejectModalTx._txCollection || DEPARTMENTS.find(d => d.code === dCode)?.txCollection || 'rehab_transactions';`
);

c = c.replace(
  /const col =\s*forwardModalTx\._txCollection \|\|\s*\(String\(forwardModalTx\.departmentCode \|\| ''\)\.toLowerCase\(\) === 'spims'\s*\?\s*'spims_transactions'\s*:\s*'rehab_transactions'\);/,
  `const dCode = String(forwardModalTx.departmentCode || '').toLowerCase();
      const col = forwardModalTx._txCollection || DEPARTMENTS.find(d => d.code === dCode)?.txCollection || 'rehab_transactions';`
);

fs.writeFileSync('apps/web/src/app/hq/dashboard/cashier/page.tsx', c);
