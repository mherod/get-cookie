import jsonwebtoken, { JwtPayload } from "jsonwebtoken";
import { parsedArgs } from "./argv";

export default function isValidJwt(token: string) {
  try {
    const result = jsonwebtoken.decode(token, { complete: true });
    if (parsedArgs.verbose && result) {
      console.debug(result);
    }
    const payload: JwtPayload = result?.payload as JwtPayload;
    if (payload) {
      const exp = payload.exp;
      if (exp) {
        const now = new Date().getTime() / 1000;
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
