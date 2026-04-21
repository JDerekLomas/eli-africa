import ee from "@google/earthengine";

let initialized = false;
let initPromise: Promise<typeof ee> | null = null;

export async function getEE(): Promise<typeof ee> {
  if (initialized) return ee;
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    const key = JSON.parse(process.env.EE_SERVICE_ACCOUNT_KEY!);

    ee.data.authenticateViaPrivateKey(
      key,
      () => {
        ee.initialize(
          null,
          null,
          () => {
            initialized = true;
            resolve(ee);
          },
          (err: Error) => reject(err),
          null,
          process.env.EE_PROJECT_ID || "gen-lang-client-0278315411"
        );
      },
      (err: Error) => reject(err)
    );
  });

  return initPromise;
}
