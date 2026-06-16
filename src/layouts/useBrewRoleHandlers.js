import { useCallback } from 'react';
import { PROFILE_CUSTOM } from '../components/SwarmConfig.helpers';
import { getProfileRoles, chooseModelForRole } from '../components/SwarmConfig.layoutHelpers';
import { fitProfileRoster, profileTargetRatio } from '../components/SwarmConfig.profileFit';
import { resolveSlotLayout } from '../components/slotLayouts';

export function useBrewRoleHandlers({
  roles, models, engine, engineModels, profileThresholds,
  hostMemory, activeMode, activeAgents, onProfileFit,
  setEngine, setRoles, setSelected, setRoleModels, setActiveProfile,
}) {
  // Re-derive role state when a preset or slot layout rebuilds the roster.
  // For roles in the new selection (whose model is being reassigned): clear the
  // `port` and `server_group` so grouping follows the new model. The proxy keys
  // llama servers by model only (server_group is a UI label), so a stale port
  // collides ("Port N assigned to incompatible servers") and a stale
  // server_group makes the client-side Memory Estimate / server-layout preview
  // split one model into phantom servers — diverging from what the proxy spawns.
  // Also apply the layout's per-role slot cap. For everyone else: just drop any
  // stale per-server `parallel` override so it doesn't ride into the next deploy.
  // (undefined ⇒ auto, which JSON.stringify drops from the deploy body.)
  const resetRosterRoles = useCallback((selectedSet, parallelMap = {}) => {
    setRoles(prev => prev.map(r => {
      if (!selectedSet.has(r.name)) {
        return r.parallel === undefined ? r : { ...r, parallel: undefined };
      }
      return { ...r, parallel: parallelMap[r.name], port: undefined, server_group: undefined };
    }));
  }, [setRoles]);
  const pickModelForRole = useCallback((roleName) => {
    const role = roles.find(r => r.name === roleName);
    const back = role?.engine || role?.backend || engine;
    const cands = models.filter(m => m.backend === back).length
      ? models.filter(m => m.backend === back) : engineModels;
    return chooseModelForRole(roleName, cands);
  }, [roles, models, engine, engineModels]);

  const handleEngineChange = useCallback(id => {
    setEngine(id);
    setSelected(new Set());
    setRoleModels({});
    setActiveProfile(PROFILE_CUSTOM);
  }, [setEngine, setSelected, setRoleModels, setActiveProfile]);

  const toggleRole = useCallback(name => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
        const path = chooseModelForRole(name, models.filter(m => {
          const role = roles.find(r => r.name === name);
          const back = role?.engine || role?.backend || engine;
          return m.backend === back;
        }));
        if (path) setRoleModels(rm => ({ ...rm, [name]: path }));
      }
      return next;
    });
    setActiveProfile(PROFILE_CUSTOM);
  }, [models, roles, engine, setSelected, setRoleModels, setActiveProfile]);

  const setModel = useCallback((name, model) => {
    setRoleModels(prev => ({ ...prev, [name]: model }));
    setActiveProfile(PROFILE_CUSTOM);
  }, [setRoleModels, setActiveProfile]);

  const selectAllRoles = useCallback(() => {
    const nextModels = {};
    roles.forEach(r => {
      const path = chooseModelForRole(r.name, models.filter(m => {
        const back = r.engine || r.backend || engine;
        return m.backend === back;
      }));
      if (path) nextModels[r.name] = path;
    });
    setRoleModels(prev => ({ ...prev, ...nextModels }));
    setSelected(new Set(roles.map(r => r.name)));
    setActiveProfile(PROFILE_CUSTOM);
  }, [roles, models, engine, setRoleModels, setSelected, setActiveProfile]);

  const clearAllRoles = useCallback(() => {
    setSelected(new Set());
    setActiveProfile(PROFILE_CUSTOM);
  }, [setSelected, setActiveProfile]);

  // reset is the useDeploy reset — passed by caller to sync deploy state on profile change.
  const applyProfile = useCallback((profileId, reset) => {
    if (profileId === PROFILE_CUSTOM) { setActiveProfile(PROFILE_CUSTOM); onProfileFit?.(null); return; }
    const roleMap   = new Map(roles.map(r => [r.name, r]));
    const ctxMap    = Object.fromEntries(roles.map(r => [r.name, r.context ?? 0]));
    const roleNames = getProfileRoles(profileId, roles.map(r => r.name), ctxMap, profileThresholds);
    const picked    = roleNames.filter(n => roleMap.has(n));
    const nextModels = {};
    for (const rn of picked) {
      const role = roleMap.get(rn);
      const back = role?.engine || role?.backend || engine;
      const cands = models.filter(m => m.backend === back).length
        ? models.filter(m => m.backend === back)
        : models.filter(m => m.backend === engine);
      const path = chooseModelForRole(rn, cands);
      if (path) nextModels[rn] = path;
    }
    // Make the roster fit host RAM (downsize models, then trim) so deploy won't OOM.
    const fit = fitProfileRoster({
      picked, roleModels: nextModels, roles, models, hostMemory, activeMode,
      deployedAgents: activeAgents, targetRatio: profileTargetRatio(profileId),
    });
    resetRosterRoles(fit.selected);
    setSelected(fit.selected);
    setRoleModels(fit.roleModels);
    setActiveProfile(profileId);
    onProfileFit?.({
      profileId,
      agents: fit.selected.size,
      downsized: fit.downsized,
      trimmed: fit.trimmed,
      projectedGb: fit.projectedGb,
      ramTotalGb: fit.ramTotalGb,
    });
    reset?.();
  }, [roles, models, engine, profileThresholds, hostMemory, activeMode, activeAgents, onProfileFit,
      resetRosterRoles, setSelected, setRoleModels, setActiveProfile]);

  // Apply a benchmarked slot layout (6-model spread vs 3-model consolidated) by
  // assigning each role a fixed model. Reuses the selected/roleModels/activeProfile
  // path so the toggle highlights via activeProfile and the Memory Estimate updates.
  const applySlotLayout = useCallback((layoutId, reset) => {
    const { selected, roleModels, parallel } = resolveSlotLayout(layoutId, roles, models);
    resetRosterRoles(selected, parallel);
    setSelected(selected);
    setRoleModels(roleModels);
    setActiveProfile(layoutId);
    onProfileFit?.(null);
    reset?.();
  }, [roles, models, resetRosterRoles, setSelected, setRoleModels, setActiveProfile, onProfileFit]);

  return {
    pickModelForRole, handleEngineChange, toggleRole,
    setModel, selectAllRoles, clearAllRoles, applyProfile, applySlotLayout,
  };
}
