import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { button, useControls } from "leva";
import React, { useEffect, useRef, useState } from "react";

import * as THREE from "three";
import { useChat } from "../hooks/useChat";

const facialExpressions = {
  default: {},
  smile: {
    browInnerUp: 0.17,
    eyeSquintLeft: 0.4,
    eyeSquintRight: 0.44,
    noseSneerLeft: 0.1700000727403593,
    noseSneerRight: 0.14000002836874015,
    mouthPressLeft: 0.61,
    mouthPressRight: 0.41000000000000003,
  },
  funnyFace: {
    jawLeft: 0.63,
    mouthPucker: 0.53,
    noseSneerLeft: 1,
    noseSneerRight: 0.39,
    mouthLeft: 1,
    eyeLookUpLeft: 1,
    eyeLookUpRight: 1,
    cheekPuff: 0.9999924982764238,
    mouthDimpleLeft: 0.414743888682652,
    mouthRollLower: 0.32,
    mouthSmileLeft: 0.35499733688813034,
    mouthSmileRight: 0.35499733688813034,
  },
  sad: {
    mouthFrownLeft: 1,
    mouthFrownRight: 1,
    mouthShrugLower: 0.78341,
    browInnerUp: 0.452,
    eyeSquintLeft: 0.72,
    eyeSquintRight: 0.75,
    eyeLookDownLeft: 0.5,
    eyeLookDownRight: 0.5,
    jawForward: 1,
  },
  surprised: {
    eyeWideLeft: 0.5,
    eyeWideRight: 0.5,
    jawOpen: 0.351,
    mouthFunnel: 1,
    browInnerUp: 1,
  },
  angry: {
    browDownLeft: 1,
    browDownRight: 1,
    eyeSquintLeft: 1,
    eyeSquintRight: 1,
    jawForward: 1,
    jawLeft: 1,
    mouthShrugLower: 1,
    noseSneerLeft: 1,
    noseSneerRight: 0.42,
    eyeLookDownLeft: 0.16,
    eyeLookDownRight: 0.16,
    cheekSquintLeft: 1,
    cheekSquintRight: 1,
    mouthClose: 0.23,
    mouthFunnel: 0.63,
    mouthDimpleRight: 1,
  },
  crazy: {
    browInnerUp: 0.9,
    jawForward: 1,
    noseSneerLeft: 0.5700000000000001,
    noseSneerRight: 0.51,
    eyeLookDownLeft: 0.39435766259644545,
    eyeLookUpRight: 0.4039761421719682,
    eyeLookInLeft: 0.9618479575523053,
    eyeLookInRight: 0.9618479575523053,
    jawOpen: 0.9618479575523053,
    mouthDimpleLeft: 0.9618479575523053,
    mouthDimpleRight: 0.9618479575523053,
    mouthStretchLeft: 0.27893590769016857,
    mouthStretchRight: 0.2885543872656917,
    mouthSmileLeft: 0.5578718153803371,
    mouthSmileRight: 0.38473918302092225,
    tongueOut: 0.9618479575523053,
  },
};

const corresponding = {
  0: "viseme_Silence",
  1: "viseme_æ_ə_ʌ",
  2: "viseme_ɑ",
  3: "viseme_ɔ",
  4: "viseme_ɛ_ʊ",
  5: "viseme_ɝ",
  6: "viseme_j_i_ɪ",
  7: "viseme_w_u",
  8: "viseme_o",
  9: "viseme_aʊ",
  10: "viseme_ɔɪ",
  11: "viseme_aɪ",
  12: "viseme_h",
  13: "viseme_ɹ",
  14: "viseme_l",
  15: "viseme_s_z",
  16: "viseme_ʃ_tʃ_dʒ_ʒ",
  17: "viseme_ð",
  18: "viseme_f_v",
  19: "viseme_d_t_n_θ",
  20: "viseme_k_g_ŋ",
  21: "viseme_p_b_m",
};

let setupMode = false;

export function Avatar(props) {
  const { avatarUrl, animationUrl, modelLoading } = useChat(); // Get the presigned URLs and loading state from context
  // Render nothing while model is loading
  if (modelLoading) return null;
  const { nodes, materials, scene } = useGLTF(avatarUrl); // Load avatar model using presigned URL
  const { animations } = useGLTF(animationUrl); // Load animations using presigned URL

  const { messages, onMessagePlayed, chat, handleStartNewChat, incorrectAttempts, currentAudio, setCurrentAudio, audioPlaying, setAudioPlaying } = useChat();

  const [lipsync, setLipsync] = useState();
  const [processedMessageId, setProcessedMessageId] = useState(null); // Track the latest processed message ID
  
  const group = useRef();
  const { actions, mixer } = useAnimations(animations, group);
  const [animation, setAnimation] = useState(
    animations.find((a) => a.name === "Idle") ? "Idle" : animations[0].name // Check if Idle animation exists otherwise use first animation
  );
  const [blink, setBlink] = useState(false);
  const [winkLeft, setWinkLeft] = useState(false);
  const [winkRight, setWinkRight] = useState(false);
  const [facialExpression, setFacialExpression] = useState("");

  const handleAudioEnded = () => {
    setAnimation("Idle");
    onMessagePlayed();
    setAudioPlaying(false);
  };

  useEffect(() => {
    if (!messages || messages.length === 0) {
      setAnimation("Idle");
      return;
    }
    
    const latestMessage = messages[messages.length - 1];
   
    if (!latestMessage || latestMessage.id === processedMessageId) {
      return;
    }

    setProcessedMessageId(latestMessage.id); // Mark this message as processed


    if (!latestMessage) {
      return;
    }

    if (!animations || animations.length === 0) {
      setAnimation("Idle");
      return;
    }
    const foundAnimation = animations.find((a) => a.name === latestMessage.animation);
    if (foundAnimation) {
      setAnimation(latestMessage.animation);
    } else {
      setAnimation("Idle");
    }
    setFacialExpression(latestMessage.facialExpression || "");

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.removeEventListener('ended', handleAudioEnded);
    }
    if (latestMessage.audio) {
      const audioSrc = "data:audio/mp3;base64," + latestMessage.audio;
      const audioObj = new Audio(audioSrc);
      audioObj.addEventListener('ended', handleAudioEnded);
      audioObj.addEventListener('canplaythrough', () => {
        audioObj.play().catch((error) => {
          console.error("Audio playback failed:", error);
        });
        setAudioPlaying(true);
      });

      setCurrentAudio(audioObj); // Store the new audio object
    }
  }, [messages, animations, onMessagePlayed, currentAudio, setCurrentAudio, setCurrentAudio, setAudioPlaying]);

  useEffect(() => {
    if (actions && actions[animation]) {
      actions[animation].reset().fadeIn(0.5).play();
    } else {
      console.error(`Animation ${animation} is undefined`);
    }
    return () => actions[animation]?.fadeOut(0.5);
  }, [animation, actions]);

  const lerpMorphTarget = (target, value, speed = 0.1) => {
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const index = child.morphTargetDictionary[target];
        if (index !== undefined) {
          child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
            child.morphTargetInfluences[index],
            value,
            speed
          );
        }
      }
    });
  };

  useFrame(() => {
    Object.keys(nodes.EyeLeft.morphTargetDictionary).forEach((key) => {
      const mapping = facialExpressions[facialExpression];
      if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") {
        if (mapping && mapping[key]) {
          lerpMorphTarget(key, mapping[key], 0.1);
        } else {
          lerpMorphTarget(key, 0, 0.1);
        }
      }
    });

    lerpMorphTarget("eyeBlinkLeft", blink || winkLeft ? 1 : 0, 0.5);
    lerpMorphTarget("eyeBlinkRight", blink || winkRight ? 1 : 0, 0.5);

    if (messages && lipsync) {
      const currentAudioTime = currentAudio.currentTime * 1000; // Convert to ms
      const appliedMorphTargets = lipsync.visemes.reduce((acc, viseme) => {
        if (currentAudioTime >= viseme.audio_offset && currentAudioTime <= viseme.audio_offset + 100) {
          const target = corresponding[viseme.viseme_id];
          acc.push(target);
          lerpMorphTarget(target, 1, 0.2);
        }
        return acc;
      }, []);

      Object.values(corresponding).forEach((value) => {
        if (!appliedMorphTargets.includes(value)) {
          lerpMorphTarget(value, 0, 0.1);
        }
      });
    }
  });

  useControls("FacialExpressions", {
    chat: button(() => chat()),
    winkLeft: button(() => {
      setWinkLeft(true);
      setTimeout(() => setWinkLeft(false), 300);
    }),
    winkRight: button(() => {
      setWinkRight(true);
      setTimeout(() => setWinkRight(false), 300);
    }),
    animation: {
      value: animation,
      options: animations.map((a) => a.name),
      onChange: (value) => setAnimation(value),
    },
    facialExpression: {
      options: Object.keys(facialExpressions),
      onChange: (value) => setFacialExpression(value),
    },
    enableSetupMode: button(() => {
      setupMode = true;
    }),
    disableSetupMode: button(() => {
      setupMode = false;
    }),
    logMorphTargetValues: button(() => {
      const emotionValues = {};
      Object.keys(nodes.EyeLeft.morphTargetDictionary).forEach((key) => {
        if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") {
          return; // eyes wink/blink are handled separately
        }
        const value =
          nodes.EyeLeft.morphTargetInfluences[
            nodes.EyeLeft.morphTargetDictionary[key]
          ];
        if (value > 0.01) {
          emotionValues[key] = value;
        }
      });
      console.log(JSON.stringify(emotionValues, null, 2));
    }),
  });

  const [, set] = useControls("MorphTarget", () =>
    Object.assign(
      {},
      ...Object.keys(nodes.EyeLeft.morphTargetDictionary).map((key) => {
        return {
          [key]: {
            label: key,
            value: 0,
            min: nodes.EyeLeft.morphTargetInfluences[
              nodes.EyeLeft.morphTargetDictionary[key]
            ],
            max: 1,
            onChange: (val) => {
              if (setupMode) {
                lerpMorphTarget(key, val, 1);
              }
            },
          },
        };
      })
    )
  );

  useEffect(() => {
    let blinkTimeout;
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          nextBlink();
        }, 200);
      }, THREE.MathUtils.randInt(1000, 5000));
    };
    nextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  // Render nothing while model is loading
  if (modelLoading) return null;

  return (
    <group {...props} dispose={null} ref={group}>
      <primitive object={nodes.Hips} />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
    </group>
  );
}

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
