import jsonwebtoken, { JwtPayload } from "jsonwebtoken";
import { parsedArgs } from "./argv";

export default function isValidJwt(token: string): boolean {
  try {
    const result = jsonwebtoken.decode(token, { complete: true });
    if (parsedArgs.verbose && result) {
      console.debug(result);
    }
    const payload: JwtPayload | undefined = result?.payload as
      | JwtPayload
      | undefined;
    if (payload) {
      const exp: number | undefined = payload.exp;
      if (exp) {
        const now: number = new Date().getTime() / 1000;
        if (now > exp) {
          return false;
        }
      }
    }
    return true;
  } catch (err) {
    return false;
  }
}
