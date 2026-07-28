import type { EligibilityRule } from "@/lib/engine/types";

export const ELIGIBILITY_RULES: EligibilityRule[] = [
  { package_id: "vcb-oto-01", dieu_kien: { thu_nhap_toi_thieu: 12_000_000, dti_toi_da: 0.55, do_tuoi_min: 20, do_tuoi_max: 65 } },
  { package_id: "bidv-oto-01", dieu_kien: { thu_nhap_toi_thieu: 12_000_000, dti_toi_da: 0.6, do_tuoi_min: 20, do_tuoi_max: 65 } },
  { package_id: "tcb-oto-01", dieu_kien: { thu_nhap_toi_thieu: 15_000_000, dti_toi_da: 0.6, do_tuoi_min: 21, do_tuoi_max: 60 } },
  { package_id: "acb-oto-01", dieu_kien: { thu_nhap_toi_thieu: 13_000_000, dti_toi_da: 0.55, do_tuoi_min: 20, do_tuoi_max: 65 } },
  { package_id: "vcb-nha-01", dieu_kien: { thu_nhap_toi_thieu: 20_000_000, dti_toi_da: 0.55, do_tuoi_min: 22, do_tuoi_max: 65 } },
  { package_id: "bidv-nha-01", dieu_kien: { thu_nhap_toi_thieu: 20_000_000, dti_toi_da: 0.6, do_tuoi_min: 22, do_tuoi_max: 65 } },
  { package_id: "vpb-nha-01", dieu_kien: { thu_nhap_toi_thieu: 18_000_000, dti_toi_da: 0.6, do_tuoi_min: 21, do_tuoi_max: 60 } },
  { package_id: "mb-nha-01", dieu_kien: { thu_nhap_toi_thieu: 18_000_000, dti_toi_da: 0.55, do_tuoi_min: 21, do_tuoi_max: 60 } },
  { package_id: "tcb-kd-01", dieu_kien: { thu_nhap_toi_thieu: 25_000_000, dti_toi_da: 0.55, do_tuoi_min: 22, do_tuoi_max: 65 } },
  { package_id: "stb-kd-01", dieu_kien: { thu_nhap_toi_thieu: 22_000_000, dti_toi_da: 0.6, do_tuoi_min: 22, do_tuoi_max: 65 } },
  { package_id: "acb-kd-01", dieu_kien: { thu_nhap_toi_thieu: 25_000_000, dti_toi_da: 0.55, do_tuoi_min: 22, do_tuoi_max: 65 } },
  { package_id: "tpb-kd-01", dieu_kien: { thu_nhap_toi_thieu: 20_000_000, dti_toi_da: 0.6, do_tuoi_min: 22, do_tuoi_max: 60 } },
  { package_id: "vpb-tc-01", dieu_kien: { thu_nhap_toi_thieu: 8_000_000, dti_toi_da: 0.5, do_tuoi_min: 20, do_tuoi_max: 60 } },
  { package_id: "mb-tc-01", dieu_kien: { thu_nhap_toi_thieu: 8_000_000, dti_toi_da: 0.5, do_tuoi_min: 20, do_tuoi_max: 60 } },
  { package_id: "tpb-tc-01", dieu_kien: { thu_nhap_toi_thieu: 7_000_000, dti_toi_da: 0.5, do_tuoi_min: 20, do_tuoi_max: 58 } },
  { package_id: "stb-tc-01", dieu_kien: { thu_nhap_toi_thieu: 7_500_000, dti_toi_da: 0.5, do_tuoi_min: 20, do_tuoi_max: 60 } },
];
