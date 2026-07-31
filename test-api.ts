import handler from './api/stocks';

async function test() {
  const req = { method: 'GET' } as any;
  const res = {
    setHeader: (name: any, value: any) => console.log(`Header: ${name} = ${value}`),
    status: (code: any) => {
      console.log(`Status: ${code}`);
      return {
        json: (data: any) => console.log(`Data:`, data),
        end: () => console.log('End'),
      };
    },
  } as any;

  try {
    await handler(req, res);
  } catch (err) {
    console.error('Handler threw:', err);
  }
}

test();
