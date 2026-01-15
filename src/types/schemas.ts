import * as z from "zod";

const Vector3Schema = z.tuple([z.number(), z.number(), z.number()]);
const Vector4Schema = z.tuple([z.number(), z.number(), z.number(), z.number()]);

export const ProjectStateSchema = z.object({
  name: z.string(),
  mode: z.union([
    z.literal("create"),
    z.literal("update"),
    z.literal("delete"),
  ]),
  tool: z.union([
    z.literal("move"),
    z.literal("select"),
    z.literal("multiselect"),
  ]),
  version: z.number(),
});

export const OptionsStateSchema = z.object({
  districtView: z.union([
    z.literal("all"),
    z.literal("current"),
    z.literal("custom"),
  ]),
  patternView: z.union([
    z.literal("none"),
    z.literal("wireframe"),
    z.literal("solid"),
  ]),
  visibleDistricts: z.array(z.string()),
  visibleMeshes: z.array(z.string()),
});

const DistrictPropertiesSchema = z.intersection(
  z.object({
    name: z.string(),
    position: Vector3Schema,
    orientation: Vector4Schema,
    transMin: Vector4Schema,
    transMax: Vector4Schema,
    cubeSize: z.number(),
  }),
  z.discriminatedUnion("isCustom", [
    z.object({
      isCustom: z.literal(true),
    }),
    z.object({
      isCustom: z.literal(false),
      texture: z.string(),
    }),
  ]),
);

export const PersistentDistrictStateSchema = z.object({
  districts: z.array(DistrictPropertiesSchema),
  current: z.union([z.string(), z.null()]),
});

export const NodeSchemaV2 = z.object({
  id: z.string(),
  label: z.string(),
  type: z.union([z.literal("group"), z.literal("instance")]),
  tag: z.union([z.literal("create"), z.literal("update"), z.literal("delete")]),
  parent: z.string().nullable(),
  district: z.string(),
  indexInDistrict: z.number(),
  hidden: z.boolean(),
  position: Vector3Schema,
  rotation: Vector3Schema,
  scale: Vector3Schema,
  mirror: z
    .union([z.literal("XY"), z.literal("XZ"), z.literal("YZ")])
    .nullable(),
  pattern: z
    .object({
      count: z.number(),
      mirror: z
        .union([z.literal("XY"), z.literal("XZ"), z.literal("YZ")])
        .nullable(),
      position: Vector3Schema,
      rotation: Vector3Schema,
      scale: Vector3Schema,
    })
    .optional(),
});
export const NodesStateSchemaV2 = z.object({
  nodes: z.record(z.string(), NodeSchemaV2),
  selected: z.string().array(),
});

export const PersistentStateSchema = z.object({
  project: ProjectStateSchema,
  options: OptionsStateSchema,
  district: PersistentDistrictStateSchema,
  nodes: NodesStateSchemaV2,
});
