package com.monster.homepage.content;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class ProfileService {

    private final SiteSettingRepository repository;
    private final ObjectMapper mapper = new ObjectMapper();

    public ProfileService(SiteSettingRepository repository) {
        this.repository = repository;
    }

    public OperationsDtos.FullProfile getProfile() {
        return new OperationsDtos.FullProfile(
                read("profile.about", OperationsDtos.ProfileAbout.class),
                read("profile.resume", OperationsDtos.ProfileResume.class),
                read("profile.uses", OperationsDtos.ProfileUses.class),
                read("profile.links", OperationsDtos.ProfileLinks.class)
        );
    }

    @Transactional
    public void saveAbout(OperationsDtos.ProfileAbout data) { write("profile.about", data); }

    @Transactional
    public void saveResume(OperationsDtos.ProfileResume data) { write("profile.resume", data); }

    @Transactional
    public void saveUses(OperationsDtos.ProfileUses data) { write("profile.uses", data); }

    @Transactional
    public void saveLinks(OperationsDtos.ProfileLinks data) { write("profile.links", data); }

    private <T> T read(String key, Class<T> type) {
        return repository.findById(key)
                .map(SiteSetting::getValue)
                .map(json -> {
                    try { return mapper.readValue(json, type); }
                    catch (JsonProcessingException e) { return null; }
                })
                .orElse(null);
    }

    private void write(String key, Object data) {
        try {
            String json = mapper.writeValueAsString(data);
            SiteSetting setting = repository.findById(key)
                    .orElseGet(() -> new SiteSetting(key, json));
            setting.setValue(json);
            repository.save(setting);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("JSON 序列化失败", e);
        }
    }
}
