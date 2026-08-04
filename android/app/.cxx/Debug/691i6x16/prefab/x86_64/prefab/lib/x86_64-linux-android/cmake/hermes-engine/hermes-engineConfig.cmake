if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "D:/.gradle/caches/8.10.2/transforms/69fe906a4d3213317a50590e1bd4ff42/transformed/hermes-android-0.75.4-debug/prefab/modules/libhermes/libs/android.x86_64/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "D:/.gradle/caches/8.10.2/transforms/69fe906a4d3213317a50590e1bd4ff42/transformed/hermes-android-0.75.4-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

