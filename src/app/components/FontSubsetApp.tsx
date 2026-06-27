import { useFontSubset } from "./font-subset/useFontSubset";
import { FontSubsetView } from "./font-subset/FontSubsetView";

export default function FontSubsetApp() {
  const model = useFontSubset();
  return <FontSubsetView {...model} />;
}
