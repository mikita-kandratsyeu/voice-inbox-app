import { Canvas, Picture, Skia } from '@shopify/react-native-skia';
import React, { useEffect } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import {
  clampGraph3DDistanceWorklet,
  graph3DDepthFadeWorklet,
  graph3DNodeBaseRadiusWorklet,
  projectPoint3DWorklet,
} from '../lib/graph3dProjectionWorklet';
import type { Graph3DSceneLayout } from '../lib/prepareGraph3DSceneLayout';

type Graph3DScenePictureProps = {
  scene: Graph3DSceneLayout | null;
  yaw: SharedValue<number>;
  pitch: SharedValue<number>;
  distance: SharedValue<number>;
  viewportWidth: number;
  viewportHeight: number;
  cameraReady: SharedValue<number>;
};

function recordEmptyPicture(viewportWidth: number, viewportHeight: number) {
  'worklet';

  const recorder = Skia.PictureRecorder();
  recorder.beginRecording(Skia.XYWHRect(0, 0, viewportWidth, viewportHeight));
  return recorder.finishRecordingAsPicture();
}

function recordGraph3DPicture(
  scene: Graph3DSceneLayout,
  yaw: number,
  pitch: number,
  distance: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  'worklet';

  const bounds = Skia.XYWHRect(0, 0, viewportWidth, viewportHeight);
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(bounds);
  const viewportScale = Math.min(viewportWidth, viewportHeight) * 0.35;

  let depthMin = Number.POSITIVE_INFINITY;
  let depthMax = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < scene.nodeCount; index += 1) {
    const pointOffset = index * 3;
    const projected = projectPoint3DWorklet(
      scene.nodePoints[pointOffset],
      scene.nodePoints[pointOffset + 1],
      scene.nodePoints[pointOffset + 2],
      yaw,
      pitch,
      distance,
      viewportWidth,
      viewportHeight,
    );

    scene.projectedX[index] = projected.x;
    scene.projectedY[index] = projected.y;
    scene.projectedZ[index] = projected.z;
    scene.projectedRadius[index] = graph3DNodeBaseRadiusWorklet(
      scene.nodeKinds[index] === 1,
      projected.scale,
    );
    scene.nodeOrder[index] = index;

    depthMin = Math.min(depthMin, projected.z);
    depthMax = Math.max(depthMax, projected.z);
  }

  if (!Number.isFinite(depthMin) || !Number.isFinite(depthMax)) {
    depthMin = 0;
    depthMax = 1;
  }

  scene.nodeOrder.sort((left, right) => scene.projectedZ[left] - scene.projectedZ[right]);

  for (const cluster of scene.clusters) {
    const projected = projectPoint3DWorklet(
      cluster.x,
      cluster.y,
      cluster.z,
      yaw,
      pitch,
      distance,
      viewportWidth,
      viewportHeight,
    );
    const depthFade = graph3DDepthFadeWorklet(projected.z, depthMin, depthMax);
    const radius = cluster.radius * projected.scale * viewportScale;
    if (radius < 8) {
      continue;
    }

    const shellPaint = Skia.Paint();
    shellPaint.setColor(cluster.color);
    shellPaint.setStrokeWidth(Math.max(1, Math.min(2.5, radius * 0.035)));
    shellPaint.setAlphaf(0.11 * depthFade);
    shellPaint.setStyle(1);
    canvas.drawCircle(projected.x, projected.y, radius, shellPaint);

    const haloPaint = Skia.Paint();
    haloPaint.setColor(cluster.color);
    haloPaint.setAlphaf(0.035 * depthFade);
    haloPaint.setStyle(0);
    canvas.drawCircle(projected.x, projected.y, radius * 0.92, haloPaint);
  }

  for (let orderIndex = 0; orderIndex < scene.edges.length; orderIndex += 1) {
    scene.edgeOrder[orderIndex] = orderIndex;
  }

  scene.edgeOrder.sort((left, right) => {
    const leftEdge = scene.edges[left];
    const rightEdge = scene.edges[right];
    const leftDepth =
      (scene.projectedZ[leftEdge.sourceIndex] + scene.projectedZ[leftEdge.targetIndex]) / 2;
    const rightDepth =
      (scene.projectedZ[rightEdge.sourceIndex] + scene.projectedZ[rightEdge.targetIndex]) / 2;
    return leftDepth - rightDepth;
  });

  for (let orderIndex = 0; orderIndex < scene.edgeOrder.length; orderIndex += 1) {
    const edge = scene.edges[scene.edgeOrder[orderIndex]];
    const edgeDepth = (scene.projectedZ[edge.sourceIndex] + scene.projectedZ[edge.targetIndex]) / 2;
    const depthFade = graph3DDepthFadeWorklet(edgeDepth, depthMin, depthMax);
    const zoomOutFactor = Math.max(0, Math.min(1, (distance - 2.2) / 4.2));
    const stride = zoomOutFactor > 0.72 ? 4 : zoomOutFactor > 0.38 ? 2 : 1;
    if (edge.importance < 3 && stride > 1 && orderIndex % stride !== 0) {
      continue;
    }
    if (edge.importance < 2 && zoomOutFactor > 0.68 && orderIndex % (stride * 2) !== 0) {
      continue;
    }

    const paint = Skia.Paint();
    paint.setColor(edge.color);
    paint.setStrokeWidth(edge.strokeWidth * (1 - zoomOutFactor * 0.22));
    paint.setAlphaf(edge.opacity * depthFade * (0.92 - zoomOutFactor * 0.36));
    paint.setStyle(1);
    paint.setStrokeCap(1);
    canvas.drawLine(
      scene.projectedX[edge.sourceIndex],
      scene.projectedY[edge.sourceIndex],
      scene.projectedX[edge.targetIndex],
      scene.projectedY[edge.targetIndex],
      paint,
    );
  }

  for (let orderIndex = 0; orderIndex < scene.nodeCount; orderIndex += 1) {
    const nodeIndex = scene.nodeOrder[orderIndex];
    const depthFade = graph3DDepthFadeWorklet(scene.projectedZ[nodeIndex], depthMin, depthMax);
    const radius = scene.projectedRadius[nodeIndex];
    const x = scene.projectedX[nodeIndex];
    const y = scene.projectedY[nodeIndex];
    const color = scene.nodeColors[nodeIndex];

    const glowPaint = Skia.Paint();
    glowPaint.setColor(color);
    glowPaint.setAlphaf(0.16 * depthFade);
    glowPaint.setStyle(0);
    canvas.drawCircle(x, y, radius * 1.85, glowPaint);

    const corePaint = Skia.Paint();
    corePaint.setColor(color);
    corePaint.setAlphaf(0.55 + depthFade * 0.45);
    corePaint.setStyle(0);
    canvas.drawCircle(x, y, radius, corePaint);

    const highlightPaint = Skia.Paint();
    highlightPaint.setColor(color);
    highlightPaint.setAlphaf(0.22 + depthFade * 0.2);
    highlightPaint.setStyle(0);
    canvas.drawCircle(x - radius * 0.18, y - radius * 0.18, radius * 0.38, highlightPaint);
  }

  return recorder.finishRecordingAsPicture();
}

export function Graph3DScenePicture({
  scene,
  yaw,
  pitch,
  distance,
  viewportWidth,
  viewportHeight,
  cameraReady,
}: Graph3DScenePictureProps) {
  const sceneSV = useSharedValue<Graph3DSceneLayout | null>(scene);
  const viewportWidthSV = useSharedValue(viewportWidth);
  const viewportHeightSV = useSharedValue(viewportHeight);

  useEffect(() => {
    sceneSV.value = scene;
  }, [scene, sceneSV]);

  useEffect(() => {
    viewportWidthSV.value = viewportWidth;
    viewportHeightSV.value = viewportHeight;
  }, [viewportHeight, viewportWidth, viewportHeightSV, viewportWidthSV]);

  const picture = useDerivedValue(() => {
    if (cameraReady.value < 1) {
      return recordEmptyPicture(viewportWidthSV.value, viewportHeightSV.value);
    }

    const layout = sceneSV.value;
    if (!layout || viewportWidthSV.value <= 0 || viewportHeightSV.value <= 0) {
      return recordEmptyPicture(
        Math.max(viewportWidthSV.value, 1),
        Math.max(viewportHeightSV.value, 1),
      );
    }

    return recordGraph3DPicture(
      layout,
      yaw.value,
      pitch.value,
      clampGraph3DDistanceWorklet(distance.value),
      viewportWidthSV.value,
      viewportHeightSV.value,
    );
  });

  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return null;
  }

  return (
    <Canvas style={{ width: viewportWidth, height: viewportHeight }}>
      <Picture picture={picture} />
    </Canvas>
  );
}
