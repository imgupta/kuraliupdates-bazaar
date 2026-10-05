package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.DailyHelpServiceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DailyHelpServiceRepository extends JpaRepository<DailyHelpServiceEntity, String> {
    List<DailyHelpServiceEntity> findByActiveOrderByCategoryAscNameAsc(Integer active);
}
