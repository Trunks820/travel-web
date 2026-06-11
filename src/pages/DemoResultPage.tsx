import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "@/stores/tripStore";
import type { TripResult } from "@/types/trip";

const MOCK_RESULT: TripResult = {
  schema_version: "1.0",
  result_id: 999,
  city: { name: "重庆" },
  request: { days: 3, people_count: 1, preferences: ["美食", "citywalk"], avoid: ["太累"] },
  plans: [
    {
      plan_id: "plan_a",
      title: "轻松经典路线",
      summary: "经典地标与老街体验，融合渝中老城风情",
      tags: ["轻松", "经典", "citywalk"],
      pace: { level: "RELAXED", commute_status: "WITHIN_LIMIT", total_commute_minutes: 65 },
      days: [
        {
          day: 1, title: "渝中老城漫步",
          commute_summary: "当天以步行为主，总通勤约 25 分钟",
          pace_status: "WITHIN_LIMIT",
          narrative: "今天从解放碑出发，沿十八梯步行至洪崖洞，感受重庆最经典的山城地标。晚上在洪崖洞看夜景，吊脚楼亮灯后是拍照的最佳时机。",
          places: [
            { place_id: 1, name: "解放碑", category: "landmark", longitude: 106.5784, latitude: 29.5574, role: "anchor", optional: false, brief: "重庆地标，商圈核心" },
            { place_id: 2, name: "十八梯", category: "culture", longitude: 106.5753, latitude: 29.5538, role: "anchor", optional: false, brief: "山城老街巷，市井生活缩影" },
            { place_id: 3, name: "洪崖洞", category: "landmark", longitude: 106.5827, latitude: 29.5631, role: "anchor", optional: false, brief: "吊脚楼建筑群，夜景绝佳" },
          ],
          commute_legs: [
            { from_place_id: 1, to_place_id: 2, mode: "walking", duration_minutes: 10, distance_meters: 700 },
            { from_place_id: 2, to_place_id: 3, mode: "walking", duration_minutes: 15, distance_meters: 1100 },
          ],
        },
        {
          day: 2, title: "南岸江景与涂鸦",
          commute_summary: "公交+步行为主，总通勤约 40 分钟",
          pace_status: "WITHIN_LIMIT",
          narrative: "上午去南滨路看两江交汇，下午到川美涂鸦街拍照打卡，傍晚在交通茶馆喝盖碗茶，体验老重庆的慢生活。",
          places: [
            { place_id: 4, name: "南滨路", category: "scenic", longitude: 106.5726, latitude: 29.5453, role: "anchor", optional: false, brief: "两江交汇的江景步道" },
            { place_id: 5, name: "川美涂鸦街", category: "culture", longitude: 106.5429, latitude: 29.5301, role: "anchor", optional: false, brief: "整条街都是艺术涂鸦" },
            { place_id: 6, name: "交通茶馆", category: "food", longitude: 106.5380, latitude: 29.5275, role: "filler", optional: true, brief: "老重庆盖碗茶，50年不变" },
          ],
          commute_legs: [
            { from_place_id: 4, to_place_id: 5, mode: "transit", duration_minutes: 25, distance_meters: 4200 },
            { from_place_id: 5, to_place_id: 6, mode: "walking", duration_minutes: 8, distance_meters: 550 },
          ],
        },
        {
          day: 3, title: "磁器口古镇半日",
          commute_summary: "轻轨+步行，总通勤约 30 分钟",
          pace_status: "WITHIN_LIMIT",
          narrative: "最后一天逛磁器口古镇，尝陈麻花和火锅底料，适合慢慢逛。下午可以去鹅岭二厂看看文创园区。",
          places: [
            { place_id: 7, name: "磁器口古镇", category: "culture", longitude: 106.4483, latitude: 29.5793, role: "anchor", optional: false, brief: "千年古镇，山城老味道" },
            { place_id: 8, name: "鹅岭二厂", category: "culture", longitude: 106.5325, latitude: 29.5525, role: "filler", optional: true, brief: "老厂房改造的文创园区" },
          ],
          commute_legs: [
            { from_place_id: 7, to_place_id: 8, mode: "transit", duration_minutes: 30, distance_meters: 9500 },
          ],
        },
      ],
    },
    {
      plan_id: "plan_b",
      title: "美食深度路线",
      summary: "以火锅、小面和江湖菜串联重庆味觉地图",
      tags: ["美食", "地道", "慢节奏"],
      pace: { level: "RELAXED", commute_status: "WITHIN_LIMIT", total_commute_minutes: 55 },
      days: [
        {
          day: 1, title: "火锅与夜景",
          commute_summary: "步行为主，约 20 分钟",
          pace_status: "WITHIN_LIMIT",
          narrative: "第一天直奔解放碑附近的老火锅店，吃完沿嘉陵江步行到洪崖洞看夜景。",
          places: [
            { place_id: 1, name: "解放碑", category: "landmark", longitude: 106.5784, latitude: 29.5574, role: "anchor", optional: false, brief: "重庆地标，商圈核心" },
            { place_id: 9, name: "珮姐老火锅", category: "food", longitude: 106.5812, latitude: 29.5587, role: "anchor", optional: false, brief: "本地人排队的老火锅" },
            { place_id: 3, name: "洪崖洞", category: "landmark", longitude: 106.5827, latitude: 29.5631, role: "filler", optional: false, brief: "吊脚楼建筑群，夜景绝佳" },
          ],
          commute_legs: [
            { from_place_id: 1, to_place_id: 9, mode: "walking", duration_minutes: 5, distance_meters: 350 },
            { from_place_id: 9, to_place_id: 3, mode: "walking", duration_minutes: 12, distance_meters: 850 },
          ],
        },
        {
          day: 2, title: "小面与老街",
          commute_summary: "步行+公交，约 35 分钟",
          pace_status: "WITHIN_LIMIT",
          narrative: "早起吃碗小面，然后逛山城步道，中午找家江湖菜馆子。",
          places: [
            { place_id: 10, name: "花市豌杂面", category: "food", longitude: 106.5760, latitude: 29.5550, role: "anchor", optional: false, brief: "本地早餐首选" },
            { place_id: 11, name: "山城步道", category: "scenic", longitude: 106.5690, latitude: 29.5580, role: "anchor", optional: false, brief: "悬崖上的城市步道" },
            { place_id: 2, name: "十八梯", category: "culture", longitude: 106.5753, latitude: 29.5538, role: "filler", optional: true, brief: "山城老街巷，市井生活缩影" },
          ],
          commute_legs: [
            { from_place_id: 10, to_place_id: 11, mode: "walking", duration_minutes: 12, distance_meters: 900 },
            { from_place_id: 11, to_place_id: 2, mode: "walking", duration_minutes: 10, distance_meters: 750 },
          ],
        },
        {
          day: 3, title: "磁器口与盖碗茶",
          commute_summary: "轻轨+步行，约 25 分钟",
          pace_status: "WITHIN_LIMIT",
          narrative: "最后一天磁器口吃陈麻花、买火锅底料，收个尾。",
          places: [
            { place_id: 7, name: "磁器口古镇", category: "culture", longitude: 106.4483, latitude: 29.5793, role: "anchor", optional: false, brief: "千年古镇，山城老味道" },
            { place_id: 6, name: "交通茶馆", category: "food", longitude: 106.5380, latitude: 29.5275, role: "filler", optional: true, brief: "老重庆盖碗茶，50年不变" },
          ],
          commute_legs: [
            { from_place_id: 7, to_place_id: 6, mode: "transit", duration_minutes: 25, distance_meters: 8000 },
          ],
        },
      ],
    },
  ],
};

export default function DemoResultPage() {
  const navigate = useNavigate();
  const setResult = useTripStore((s) => s.setResult);

  useEffect(() => {
    setResult(MOCK_RESULT);
    navigate("/result/999", { replace: true });
  }, [setResult, navigate]);

  return null;
}
