#!/bin/bash
# Alle Abende bauen: ./abende.sh [1-7 ...]  (ohne Argument: alle)
declare -A P N
P[1]=a1_intro,a1_c1_fs,a1_c1_lz,a1_c1_lz2,a1_c1_ft,a1_c1_ap,a1_c1_end,a1_c2_a,a1_c2_b,a1_c2_c;  N[1]=KlasseC_Abend1_C1_C2
P[2]=a2_intro,a2_kraftweg,a2_motor,a2_getr,a2_diff,a2_c3_end,a2_c4_a,a2_c4_b,a2_c4_c;           N[2]=KlasseC_Abend2_C3_C4
P[3]=a3_intro,a3_c5_a,a3_c5_b,a3_c6_a,a3_c6_b;                                                  N[3]=KlasseC_Abend3_C5_C6
P[4]=a4_intro,a4_c7_a,a4_c7_b,a4_c7_c,a4_c7_d,a4_c8_a,a4_c8_b,a4_c8_c;                          N[4]=KlasseC_Abend4_C7_C8
P[5]=a5_intro,a5_c9_a,a5_c9_b,a5_c9_c,a5_c9_d,a5_c9_e,a5_c10_a,a5_c10_b,a5_c10_c;               N[5]=KlasseC_Abend5_C9_C10
P[6]=a6_intro,a6_ce1_a,a6_ce1_b,a6_ce1_c,a6_ce1_d,a6_ce1_e,a6_ce2_a,a6_ce2_b,a6_ce2_c,a6_ce2_d; N[6]=KlasseCE_Abend6_CE1_CE2
P[7]=a7_intro,a7_ce3_a,a7_ce3_b,a7_ce3_c,a7_ce4_a,a7_ce4_b,a7_ce4_c,a7_ce4_d;                   N[7]=KlasseCE_Abend7_CE3_CE4
for i in ${@:-1 2 3 4 5 6 7}; do
  PARTS=${P[$i]} OUT=${N[$i]} node build.js | tail -1
done
