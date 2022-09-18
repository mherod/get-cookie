import jsonwebtoken from "jsonwebtoken";
import { env } from "./global";

export default function isValidJwt(token) {
  if (typeof token !== "string") {
    return false;
  }
  try {
    const result = jsonwebtoken.decode(token, { complete: true });
    if (env.VERBOSE) {
      console.log(result);
    }
    return true;
  } catch (err) {
    return false;
  }
}
