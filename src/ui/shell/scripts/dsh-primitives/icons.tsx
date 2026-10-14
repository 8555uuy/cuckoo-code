/**
 * DSH 图标（@deepseek-ai/dsh-client-ui-primitives 的 icons 部分）
 *
 * 策略：**机制 + 名单**（不逐个实现，不抄 DSH 代码）：
 *  - 名单：从 DSH 源码抄的【名字】（API 契约）——188 个具名导出
 *  - 每个名字 → 占位图标组件（统一 SVG，不崩）
 *
 * ⚠️ 关键：DSH 插件用 __toESM(require(...)) 包装——它靠 getOwnPropertyNames
 * 遍历。所以导出必须是【具名常量】（不能 Proxy / 不能动态对象）。
 */
import { createElement } from 'react';

/** 占位图标：统一 SVG（圆角方块） */
function makePlaceholder(name: string): any {
  return function PlaceholderIcon(props: any) {
    const size = (props && props.size) || 16;
    return createElement('svg', {
      width: size, height: size, viewBox: "0 0 24 24", fill: "none",
      stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
      className: (props && props.className) || undefined,
      "aria-hidden": true,
    }, createElement("rect", { x: 4, y: 4, width: 16, height: 16, rx: 3 }));
  };
}
export const IconAgentPresetOutlineMedium = makePlaceholder('IconAgentPresetOutlineMedium');
export const IconAgentPresetOutlineRegular = makePlaceholder('IconAgentPresetOutlineRegular');
export const IconAlarmClockOutlineMedium = makePlaceholder('IconAlarmClockOutlineMedium');
export const IconAlarmClockOutlineRegular = makePlaceholder('IconAlarmClockOutlineRegular');
export const IconApiOutlineMedium = makePlaceholder('IconApiOutlineMedium');
export const IconApiOutlineRegular = makePlaceholder('IconApiOutlineRegular');
export const IconArchiveCheckOutlineMedium = makePlaceholder('IconArchiveCheckOutlineMedium');
export const IconArchiveCheckOutlineRegular = makePlaceholder('IconArchiveCheckOutlineRegular');
export const IconArchiveOffOutlineMedium = makePlaceholder('IconArchiveOffOutlineMedium');
export const IconArchiveOffOutlineRegular = makePlaceholder('IconArchiveOffOutlineRegular');
export const IconArchiveOutlineMedium = makePlaceholder('IconArchiveOutlineMedium');
export const IconArchiveOutlineRegular = makePlaceholder('IconArchiveOutlineRegular');
export const IconBranchOutlineMedium = makePlaceholder('IconBranchOutlineMedium');
export const IconBranchOutlineRegular = makePlaceholder('IconBranchOutlineRegular');
export const IconBrowseOutlineMedium = makePlaceholder('IconBrowseOutlineMedium');
export const IconBrowseOutlineRegular = makePlaceholder('IconBrowseOutlineRegular');
export const IconCheckCircleFillMedium = makePlaceholder('IconCheckCircleFillMedium');
export const IconCheckCircleFillRegular = makePlaceholder('IconCheckCircleFillRegular');
export const IconCheckCircleOutlineMedium = makePlaceholder('IconCheckCircleOutlineMedium');
export const IconCheckCircleOutlineRegular = makePlaceholder('IconCheckCircleOutlineRegular');
export const IconCheckOutlineMedium = makePlaceholder('IconCheckOutlineMedium');
export const IconCheckOutlineRegular = makePlaceholder('IconCheckOutlineRegular');
export const IconChecklistOutlineMedium = makePlaceholder('IconChecklistOutlineMedium');
export const IconChecklistOutlineRegular = makePlaceholder('IconChecklistOutlineRegular');
export const IconChevronDownOutlineMedium = makePlaceholder('IconChevronDownOutlineMedium');
export const IconChevronDownOutlineRegular = makePlaceholder('IconChevronDownOutlineRegular');
export const IconChevronLeftOutlineMedium = makePlaceholder('IconChevronLeftOutlineMedium');
export const IconChevronLeftOutlineRegular = makePlaceholder('IconChevronLeftOutlineRegular');
export const IconChevronRightOutlineMedium = makePlaceholder('IconChevronRightOutlineMedium');
export const IconChevronRightOutlineRegular = makePlaceholder('IconChevronRightOutlineRegular');
export const IconChevronUpOutlineMedium = makePlaceholder('IconChevronUpOutlineMedium');
export const IconChevronUpOutlineRegular = makePlaceholder('IconChevronUpOutlineRegular');
export const IconChevronsUpDownOutlineMedium = makePlaceholder('IconChevronsUpDownOutlineMedium');
export const IconChevronsUpDownOutlineRegular = makePlaceholder('IconChevronsUpDownOutlineRegular');
export const IconClockOutlineMedium = makePlaceholder('IconClockOutlineMedium');
export const IconClockOutlineRegular = makePlaceholder('IconClockOutlineRegular');
export const IconCloseCircleFillMedium = makePlaceholder('IconCloseCircleFillMedium');
export const IconCloseCircleFillRegular = makePlaceholder('IconCloseCircleFillRegular');
export const IconCloseFillMedium = makePlaceholder('IconCloseFillMedium');
export const IconCloseFillRegular = makePlaceholder('IconCloseFillRegular');
export const IconCloseOutlineMedium = makePlaceholder('IconCloseOutlineMedium');
export const IconCloseOutlineRegular = makePlaceholder('IconCloseOutlineRegular');
export const IconCodeOutlineMedium = makePlaceholder('IconCodeOutlineMedium');
export const IconCodeOutlineRegular = makePlaceholder('IconCodeOutlineRegular');
export const IconCompactOutlineMedium = makePlaceholder('IconCompactOutlineMedium');
export const IconCompactOutlineRegular = makePlaceholder('IconCompactOutlineRegular');
export const IconCompareSplitOutlineMedium = makePlaceholder('IconCompareSplitOutlineMedium');
export const IconCompareSplitOutlineRegular = makePlaceholder('IconCompareSplitOutlineRegular');
export const IconContextInjectionOutlineMedium = makePlaceholder('IconContextInjectionOutlineMedium');
export const IconContextInjectionOutlineRegular = makePlaceholder('IconContextInjectionOutlineRegular');
export const IconCopyOutlineMedium = makePlaceholder('IconCopyOutlineMedium');
export const IconCopyOutlineRegular = makePlaceholder('IconCopyOutlineRegular');
export const IconCordisPluginOutlineMedium = makePlaceholder('IconCordisPluginOutlineMedium');
export const IconCordisPluginOutlineRegular = makePlaceholder('IconCordisPluginOutlineRegular');
export const IconDarkOutlineMedium = makePlaceholder('IconDarkOutlineMedium');
export const IconDarkOutlineRegular = makePlaceholder('IconDarkOutlineRegular');
export const IconDataOutlineMedium = makePlaceholder('IconDataOutlineMedium');
export const IconDataOutlineRegular = makePlaceholder('IconDataOutlineRegular');
export const IconDatabaseOutlineMedium = makePlaceholder('IconDatabaseOutlineMedium');
export const IconDatabaseOutlineRegular = makePlaceholder('IconDatabaseOutlineRegular');
export const IconDeliverDocMedium = makePlaceholder('IconDeliverDocMedium');
export const IconDeliverDocRegular = makePlaceholder('IconDeliverDocRegular');
export const IconDislikeFillMedium = makePlaceholder('IconDislikeFillMedium');
export const IconDislikeFillRegular = makePlaceholder('IconDislikeFillRegular');
export const IconDislikeOutlineMedium = makePlaceholder('IconDislikeOutlineMedium');
export const IconDislikeOutlineRegular = makePlaceholder('IconDislikeOutlineRegular');
export const IconDownloadOutlineMedium = makePlaceholder('IconDownloadOutlineMedium');
export const IconDownloadOutlineRegular = makePlaceholder('IconDownloadOutlineRegular');
export const IconEditOutlineMedium = makePlaceholder('IconEditOutlineMedium');
export const IconEditOutlineRegular = makePlaceholder('IconEditOutlineRegular');
export const IconEllipsisOutlineMedium = makePlaceholder('IconEllipsisOutlineMedium');
export const IconEllipsisOutlineRegular = makePlaceholder('IconEllipsisOutlineRegular');
export const IconEnhanceOutlineMedium = makePlaceholder('IconEnhanceOutlineMedium');
export const IconEnhanceOutlineRegular = makePlaceholder('IconEnhanceOutlineRegular');
export const IconFlatListOutlineMedium = makePlaceholder('IconFlatListOutlineMedium');
export const IconFlatListOutlineRegular = makePlaceholder('IconFlatListOutlineRegular');
export const IconFolderCloseMedium = makePlaceholder('IconFolderCloseMedium');
export const IconFolderCloseRegular = makePlaceholder('IconFolderCloseRegular');
export const IconFolderOpenMedium = makePlaceholder('IconFolderOpenMedium');
export const IconFolderOpenOutlineMedium = makePlaceholder('IconFolderOpenOutlineMedium');
export const IconFolderOpenOutlineRegular = makePlaceholder('IconFolderOpenOutlineRegular');
export const IconFolderOpenRegular = makePlaceholder('IconFolderOpenRegular');
export const IconFollowsystemOutlineMedium = makePlaceholder('IconFollowsystemOutlineMedium');
export const IconFollowsystemOutlineRegular = makePlaceholder('IconFollowsystemOutlineRegular');
export const IconFullscreenOutlineMedium = makePlaceholder('IconFullscreenOutlineMedium');
export const IconFullscreenOutlineRegular = makePlaceholder('IconFullscreenOutlineRegular');
export const IconGaugeOutlineMedium = makePlaceholder('IconGaugeOutlineMedium');
export const IconGaugeOutlineRegular = makePlaceholder('IconGaugeOutlineRegular');
export const IconGlobeOutlineMedium = makePlaceholder('IconGlobeOutlineMedium');
export const IconGlobeOutlineRegular = makePlaceholder('IconGlobeOutlineRegular');
export const IconGoalOutlineMedium = makePlaceholder('IconGoalOutlineMedium');
export const IconGoalOutlineRegular = makePlaceholder('IconGoalOutlineRegular');
export const IconInfoOutlineMedium = makePlaceholder('IconInfoOutlineMedium');
export const IconInfoOutlineRegular = makePlaceholder('IconInfoOutlineRegular');
export const IconInspectOutlineMedium = makePlaceholder('IconInspectOutlineMedium');
export const IconInspectOutlineRegular = makePlaceholder('IconInspectOutlineRegular');
export const IconLightOutlineMedium = makePlaceholder('IconLightOutlineMedium');
export const IconLightOutlineRegular = makePlaceholder('IconLightOutlineRegular');
export const IconLikeFillMedium = makePlaceholder('IconLikeFillMedium');
export const IconLikeFillRegular = makePlaceholder('IconLikeFillRegular');
export const IconLikeOutlineMedium = makePlaceholder('IconLikeOutlineMedium');
export const IconLikeOutlineRegular = makePlaceholder('IconLikeOutlineRegular');
export const IconLinkOutlineMedium = makePlaceholder('IconLinkOutlineMedium');
export const IconLinkOutlineRegular = makePlaceholder('IconLinkOutlineRegular');
export const IconListPenOutlineMedium = makePlaceholder('IconListPenOutlineMedium');
export const IconListPenOutlineRegular = makePlaceholder('IconListPenOutlineRegular');
export const IconLoadingOutlineMedium = makePlaceholder('IconLoadingOutlineMedium');
export const IconLoadingOutlineRegular = makePlaceholder('IconLoadingOutlineRegular');
export const IconMicrophoneOutlineMedium = makePlaceholder('IconMicrophoneOutlineMedium');
export const IconMicrophoneOutlineRegular = makePlaceholder('IconMicrophoneOutlineRegular');
export const IconNewChatOutlineMedium = makePlaceholder('IconNewChatOutlineMedium');
export const IconNewChatOutlineRegular = makePlaceholder('IconNewChatOutlineRegular');
export const IconNowrapFillMedium = makePlaceholder('IconNowrapFillMedium');
export const IconNowrapFillRegular = makePlaceholder('IconNowrapFillRegular');
export const IconPanelLeftOutlineMedium = makePlaceholder('IconPanelLeftOutlineMedium');
export const IconPanelLeftOutlineRegular = makePlaceholder('IconPanelLeftOutlineRegular');
export const IconPaperPlaneOutlineMedium = makePlaceholder('IconPaperPlaneOutlineMedium');
export const IconPaperPlaneOutlineRegular = makePlaceholder('IconPaperPlaneOutlineRegular');
export const IconPaperclipOutlineMedium = makePlaceholder('IconPaperclipOutlineMedium');
export const IconPaperclipOutlineRegular = makePlaceholder('IconPaperclipOutlineRegular');
export const IconPauseOutlineMedium = makePlaceholder('IconPauseOutlineMedium');
export const IconPauseOutlineRegular = makePlaceholder('IconPauseOutlineRegular');
export const IconPersonalizationOutlineMedium = makePlaceholder('IconPersonalizationOutlineMedium');
export const IconPersonalizationOutlineRegular = makePlaceholder('IconPersonalizationOutlineRegular');
export const IconPinFillMedium = makePlaceholder('IconPinFillMedium');
export const IconPinFillRegular = makePlaceholder('IconPinFillRegular');
export const IconPinOutlineMedium = makePlaceholder('IconPinOutlineMedium');
export const IconPinOutlineRegular = makePlaceholder('IconPinOutlineRegular');
export const IconPlanOutlineMedium = makePlaceholder('IconPlanOutlineMedium');
export const IconPlanOutlineRegular = makePlaceholder('IconPlanOutlineRegular');
export const IconPlayOutlineMedium = makePlaceholder('IconPlayOutlineMedium');
export const IconPlayOutlineRegular = makePlaceholder('IconPlayOutlineRegular');
export const IconPluginPinwheelOutlineMedium = makePlaceholder('IconPluginPinwheelOutlineMedium');
export const IconPluginPinwheelOutlineRegular = makePlaceholder('IconPluginPinwheelOutlineRegular');
export const IconPlusOutlineMedium = makePlaceholder('IconPlusOutlineMedium');
export const IconPlusOutlineRegular = makePlaceholder('IconPlusOutlineRegular');
export const IconProjectAddOutlineMedium = makePlaceholder('IconProjectAddOutlineMedium');
export const IconProjectAddOutlineRegular = makePlaceholder('IconProjectAddOutlineRegular');
export const IconQuestionOutlineMedium = makePlaceholder('IconQuestionOutlineMedium');
export const IconQuestionOutlineRegular = makePlaceholder('IconQuestionOutlineRegular');
export const IconQueueOutlineMedium = makePlaceholder('IconQueueOutlineMedium');
export const IconQueueOutlineRegular = makePlaceholder('IconQueueOutlineRegular');
export const IconRefreshOutlineMedium = makePlaceholder('IconRefreshOutlineMedium');
export const IconRefreshOutlineRegular = makePlaceholder('IconRefreshOutlineRegular');
export const IconRightUpOutlineMedium = makePlaceholder('IconRightUpOutlineMedium');
export const IconRightUpOutlineRegular = makePlaceholder('IconRightUpOutlineRegular');
export const IconSearchOutlineMedium = makePlaceholder('IconSearchOutlineMedium');
export const IconSearchOutlineRegular = makePlaceholder('IconSearchOutlineRegular');
export const IconSendOutlineMedium = makePlaceholder('IconSendOutlineMedium');
export const IconSendOutlineRegular = makePlaceholder('IconSendOutlineRegular');
export const IconSettingsOutlineMedium = makePlaceholder('IconSettingsOutlineMedium');
export const IconSettingsOutlineRegular = makePlaceholder('IconSettingsOutlineRegular');
export const IconShareOutlineMedium = makePlaceholder('IconShareOutlineMedium');
export const IconShareOutlineRegular = makePlaceholder('IconShareOutlineRegular');
export const IconShieldOutlineMedium = makePlaceholder('IconShieldOutlineMedium');
export const IconShieldOutlineRegular = makePlaceholder('IconShieldOutlineRegular');
export const IconSkillOutlineMedium = makePlaceholder('IconSkillOutlineMedium');
export const IconSkillOutlineRegular = makePlaceholder('IconSkillOutlineRegular');
export const IconSlidersTwoOutlineMedium = makePlaceholder('IconSlidersTwoOutlineMedium');
export const IconSlidersTwoOutlineRegular = makePlaceholder('IconSlidersTwoOutlineRegular');
export const IconSparkleMedium = makePlaceholder('IconSparkleMedium');
export const IconSparkleRegular = makePlaceholder('IconSparkleRegular');
export const IconStopFillMedium = makePlaceholder('IconStopFillMedium');
export const IconStopFillRegular = makePlaceholder('IconStopFillRegular');
export const IconThinkOutlineMedium = makePlaceholder('IconThinkOutlineMedium');
export const IconThinkOutlineRegular = makePlaceholder('IconThinkOutlineRegular');
export const IconTrashOutlineMedium = makePlaceholder('IconTrashOutlineMedium');
export const IconTrashOutlineRegular = makePlaceholder('IconTrashOutlineRegular');
export const IconTreeCornerMedium = makePlaceholder('IconTreeCornerMedium');
export const IconTreeCornerRegular = makePlaceholder('IconTreeCornerRegular');
export const IconTriangleRightFillMedium = makePlaceholder('IconTriangleRightFillMedium');
export const IconTriangleRightFillRegular = makePlaceholder('IconTriangleRightFillRegular');
export const IconUnarchiveOutlineMedium = makePlaceholder('IconUnarchiveOutlineMedium');
export const IconUnarchiveOutlineRegular = makePlaceholder('IconUnarchiveOutlineRegular');
export const IconUserOutlineMedium = makePlaceholder('IconUserOutlineMedium');
export const IconUserOutlineRegular = makePlaceholder('IconUserOutlineRegular');
export const IconUsersOutlineMedium = makePlaceholder('IconUsersOutlineMedium');
export const IconUsersOutlineRegular = makePlaceholder('IconUsersOutlineRegular');
export const IconWarningOutlineMedium = makePlaceholder('IconWarningOutlineMedium');
export const IconWarningOutlineRegular = makePlaceholder('IconWarningOutlineRegular');
export const IconWarningTriangleOutlineMedium = makePlaceholder('IconWarningTriangleOutlineMedium');
export const IconWarningTriangleOutlineRegular = makePlaceholder('IconWarningTriangleOutlineRegular');
export const IconWorkspaceTreeOutlineMedium = makePlaceholder('IconWorkspaceTreeOutlineMedium');
export const IconWorkspaceTreeOutlineRegular = makePlaceholder('IconWorkspaceTreeOutlineRegular');
export const IconWrapFillMedium = makePlaceholder('IconWrapFillMedium');
export const IconWrapFillRegular = makePlaceholder('IconWrapFillRegular');
export const IconWrapLinesOutlineMedium = makePlaceholder('IconWrapLinesOutlineMedium');
export const IconWrapLinesOutlineRegular = makePlaceholder('IconWrapLinesOutlineRegular');

/** 全部图标名 */
export const ICON_NAMES: string[] = ["IconAgentPresetOutlineMedium","IconAgentPresetOutlineRegular","IconAlarmClockOutlineMedium","IconAlarmClockOutlineRegular","IconApiOutlineMedium","IconApiOutlineRegular","IconArchiveCheckOutlineMedium","IconArchiveCheckOutlineRegular","IconArchiveOffOutlineMedium","IconArchiveOffOutlineRegular","IconArchiveOutlineMedium","IconArchiveOutlineRegular","IconBranchOutlineMedium","IconBranchOutlineRegular","IconBrowseOutlineMedium","IconBrowseOutlineRegular","IconCheckCircleFillMedium","IconCheckCircleFillRegular","IconCheckCircleOutlineMedium","IconCheckCircleOutlineRegular","IconCheckOutlineMedium","IconCheckOutlineRegular","IconChecklistOutlineMedium","IconChecklistOutlineRegular","IconChevronDownOutlineMedium","IconChevronDownOutlineRegular","IconChevronLeftOutlineMedium","IconChevronLeftOutlineRegular","IconChevronRightOutlineMedium","IconChevronRightOutlineRegular","IconChevronUpOutlineMedium","IconChevronUpOutlineRegular","IconChevronsUpDownOutlineMedium","IconChevronsUpDownOutlineRegular","IconClockOutlineMedium","IconClockOutlineRegular","IconCloseCircleFillMedium","IconCloseCircleFillRegular","IconCloseFillMedium","IconCloseFillRegular","IconCloseOutlineMedium","IconCloseOutlineRegular","IconCodeOutlineMedium","IconCodeOutlineRegular","IconCompactOutlineMedium","IconCompactOutlineRegular","IconCompareSplitOutlineMedium","IconCompareSplitOutlineRegular","IconContextInjectionOutlineMedium","IconContextInjectionOutlineRegular","IconCopyOutlineMedium","IconCopyOutlineRegular","IconCordisPluginOutlineMedium","IconCordisPluginOutlineRegular","IconDarkOutlineMedium","IconDarkOutlineRegular","IconDataOutlineMedium","IconDataOutlineRegular","IconDatabaseOutlineMedium","IconDatabaseOutlineRegular","IconDeliverDocMedium","IconDeliverDocRegular","IconDislikeFillMedium","IconDislikeFillRegular","IconDislikeOutlineMedium","IconDislikeOutlineRegular","IconDownloadOutlineMedium","IconDownloadOutlineRegular","IconEditOutlineMedium","IconEditOutlineRegular","IconEllipsisOutlineMedium","IconEllipsisOutlineRegular","IconEnhanceOutlineMedium","IconEnhanceOutlineRegular","IconFlatListOutlineMedium","IconFlatListOutlineRegular","IconFolderCloseMedium","IconFolderCloseRegular","IconFolderOpenMedium","IconFolderOpenOutlineMedium","IconFolderOpenOutlineRegular","IconFolderOpenRegular","IconFollowsystemOutlineMedium","IconFollowsystemOutlineRegular","IconFullscreenOutlineMedium","IconFullscreenOutlineRegular","IconGaugeOutlineMedium","IconGaugeOutlineRegular","IconGlobeOutlineMedium","IconGlobeOutlineRegular","IconGoalOutlineMedium","IconGoalOutlineRegular","IconInfoOutlineMedium","IconInfoOutlineRegular","IconInspectOutlineMedium","IconInspectOutlineRegular","IconLightOutlineMedium","IconLightOutlineRegular","IconLikeFillMedium","IconLikeFillRegular","IconLikeOutlineMedium","IconLikeOutlineRegular","IconLinkOutlineMedium","IconLinkOutlineRegular","IconListPenOutlineMedium","IconListPenOutlineRegular","IconLoadingOutlineMedium","IconLoadingOutlineRegular","IconMicrophoneOutlineMedium","IconMicrophoneOutlineRegular","IconNewChatOutlineMedium","IconNewChatOutlineRegular","IconNowrapFillMedium","IconNowrapFillRegular","IconPanelLeftOutlineMedium","IconPanelLeftOutlineRegular","IconPaperPlaneOutlineMedium","IconPaperPlaneOutlineRegular","IconPaperclipOutlineMedium","IconPaperclipOutlineRegular","IconPauseOutlineMedium","IconPauseOutlineRegular","IconPersonalizationOutlineMedium","IconPersonalizationOutlineRegular","IconPinFillMedium","IconPinFillRegular","IconPinOutlineMedium","IconPinOutlineRegular","IconPlanOutlineMedium","IconPlanOutlineRegular","IconPlayOutlineMedium","IconPlayOutlineRegular","IconPluginPinwheelOutlineMedium","IconPluginPinwheelOutlineRegular","IconPlusOutlineMedium","IconPlusOutlineRegular","IconProjectAddOutlineMedium","IconProjectAddOutlineRegular","IconQuestionOutlineMedium","IconQuestionOutlineRegular","IconQueueOutlineMedium","IconQueueOutlineRegular","IconRefreshOutlineMedium","IconRefreshOutlineRegular","IconRightUpOutlineMedium","IconRightUpOutlineRegular","IconSearchOutlineMedium","IconSearchOutlineRegular","IconSendOutlineMedium","IconSendOutlineRegular","IconSettingsOutlineMedium","IconSettingsOutlineRegular","IconShareOutlineMedium","IconShareOutlineRegular","IconShieldOutlineMedium","IconShieldOutlineRegular","IconSkillOutlineMedium","IconSkillOutlineRegular","IconSlidersTwoOutlineMedium","IconSlidersTwoOutlineRegular","IconSparkleMedium","IconSparkleRegular","IconStopFillMedium","IconStopFillRegular","IconThinkOutlineMedium","IconThinkOutlineRegular","IconTrashOutlineMedium","IconTrashOutlineRegular","IconTreeCornerMedium","IconTreeCornerRegular","IconTriangleRightFillMedium","IconTriangleRightFillRegular","IconUnarchiveOutlineMedium","IconUnarchiveOutlineRegular","IconUserOutlineMedium","IconUserOutlineRegular","IconUsersOutlineMedium","IconUsersOutlineRegular","IconWarningOutlineMedium","IconWarningOutlineRegular","IconWarningTriangleOutlineMedium","IconWarningTriangleOutlineRegular","IconWorkspaceTreeOutlineMedium","IconWorkspaceTreeOutlineRegular","IconWrapFillMedium","IconWrapFillRegular","IconWrapLinesOutlineMedium","IconWrapLinesOutlineRegular"];
