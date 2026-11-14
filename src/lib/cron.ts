export function cronAuthorized(req: Request): boolean {
  const secret = process.env.SIXXAB_CRON_SECRET;
  return !!secret && req.headers.get('authorization') === `Bearer ${secret}`;
}
