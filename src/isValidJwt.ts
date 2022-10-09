import jsonwebtoken, { JwtPayload } from "jsonwebtoken";
import { env } from "./global";

export default function isValidJwt(token: any) {
  try {
    const result = jsonwebtoken.decode(token, { complete: true });
    if (env.VERBOSE) {
      console.log(result);
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
