import { messages as app } from "@/app/appMessages";
import { mergeMessages, type Messages } from "@/app/i18n";
import { messages as charts } from "@/features/charts/messages";
import { messages as device } from "@/features/device/messages";
import { messages as exportMessages } from "@/features/export/messages";
import { messages as flyover } from "@/features/flyover/messages";
import { messages as library } from "@/features/library/messages";
import { messages as map } from "@/features/map/messages";
import { messages as metrics } from "@/features/metrics/messages";
import { messages as model } from "@/features/model/messages";
import { messages as offline } from "@/features/offline/messages";
import { messages as settings } from "@/features/settings/messages";
import { messages as share } from "@/features/share/messages";
import { messages as tools } from "@/features/tools/messages";

/**
 * Every translation of the app. Each area keeps its texts in its own `messages.ts`, so areas can
 * be built independently; add a new area's file to this list.
 */
export const AREA_MESSAGES: Messages[] = [
  app,
  charts,
  device,
  exportMessages,
  flyover,
  library,
  map,
  metrics,
  model,
  offline,
  settings,
  share,
  tools,
];

export const MESSAGES = mergeMessages(...AREA_MESSAGES);
