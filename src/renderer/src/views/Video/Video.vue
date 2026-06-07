<template>
  <div class="video-container">
    <div class="video-list" ref="videoList" @scroll="handleScroll">
      <div
        v-for="(video, index) in displayVideos"
        :key="index"
        class="video-item"
        :class="{ active: currentIndex === index }"
        ref="videoItems"
      >
        <video
          :src="getVideoUrl(video.src)"
          class="video"
          :id="`video-${index}`"
          playsinline
          webkit-playsinline
          @click="togglePlay(index)"
          preload="auto"
          loop
          ref="videos"
        ></video>
      </div>
    </div>
    <div v-if="loading" class="loading">加载中...</div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'VideoComponent',
  data() {
    return {
      videos: [],
      currentIndex: 0,
      isPlaying: false,
      displayVideos: [],
      observer: null,
      loading: false,
      baseUrl: 'http://localhost:8000' // 后端FastAPI服务地址
    };
  },
  mounted() {
    this.fetchVideos();
  },
  beforeUnmount() {
    if (this.observer) {
      this.observer.disconnect();
    }
  },
  methods: {
    getVideoUrl(src) {
      // 如果src已经是完整的URL，则直接返回
      if (src.startsWith('http')) {
        return src;
      }
      // 否则拼接baseUrl
      return `${this.baseUrl}${src}`;
    },
    async fetchVideos() {
      try {
        this.loading = true;
        // 使用完整URL请求API
        const response = await axios.get(`${this.baseUrl}/api/getVideos`);
        if (response.data.code === 200) {
          this.videos = response.data.data;
          this.initVideos();
          this.setupIntersectionObserver();
        } else {
          console.error('获取视频失败:', response.data.message);
        }
      } catch (error) {
        console.error('获取视频出错:', error);
      } finally {
        this.loading = false;
      }
    },
    initVideos() {
      // Initialize with initial set of videos
      this.displayVideos = [...this.videos];
    },
    setupIntersectionObserver() {
      const options = {
        root: this.$refs.videoList,
        rootMargin: '0px',
        threshold: 0.8, // 80% visibility to trigger
      };

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const index = Array.from(this.$refs.videoItems).findIndex(
            (item) => item === entry.target
          );

          if (entry.isIntersecting) {
            this.currentIndex = index;
            // 不再自动播放视频，只更新当前索引
          } else {
            this.pauseVideo(index);
          }
        });
      }, options);

      // Observe all video items
      this.$nextTick(() => {
        if (this.$refs.videoItems) {
          this.$refs.videoItems.forEach((item) => {
            this.observer.observe(item);
          });
        }
      });
    },
    playVideo(index) {
      const video = document.getElementById(`video-${index}`);
      if (video) {
        video.play().catch((err) => {
          console.error('Error playing video:', err);
        });
      }
    },
    pauseVideo(index) {
      const video = document.getElementById(`video-${index}`);
      if (video) {
        video.pause();
      }
    },
    togglePlay(index) {
      const video = document.getElementById(`video-${index}`);
      if (video) {
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      }
    },
    // Infinite scroll implementation
    loadMoreVideos() {
      // Add more videos when user scrolls to bottom
      this.displayVideos = [
        ...this.displayVideos,
        ...this.videos.map(video => ({ ...video }))
      ];
      
      // Update observers for new items
      this.$nextTick(() => {
        if (this.$refs.videoItems) {
          const startIdx = this.displayVideos.length - this.videos.length;
          for (let i = startIdx; i < this.displayVideos.length; i++) {
            this.observer.observe(this.$refs.videoItems[i]);
          }
        }
      });
    },
    handleScroll() {
      const container = this.$refs.videoList;
      // If scrolled near bottom, load more videos
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 300) {
        this.loadMoreVideos();
      }
    }
  },
  watch: {
    currentIndex(newIndex, oldIndex) {
      // Pause the old video
      if (oldIndex !== newIndex) {
        this.pauseVideo(oldIndex);
      }
    }
  }
};
</script>

<style scoped>
.video-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.video-list {
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
}

.video-item {
  position: relative;
  width: 100%;
  height: 100vh;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000;
}

.video {
  height: 100%;
  object-fit: cover;
}

.video-item.active {
  z-index: 1;
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 10px 20px;
  border-radius: 4px;
  z-index: 10;
}
</style> 