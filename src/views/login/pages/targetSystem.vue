<template>
  <div
    v-loading="ticketLoading"
    class="targetSystemPages"
  />
</template>
<script>
import { defineComponent } from 'vue';
import authGlobal from '@/utils/authGlobalHand';

export default defineComponent({
  name: 'TargetSystemPages',
  data() {
    return {
      ticketLoading: false
    };
  },
  computed: {},
  watch: {},
  created() {
    this.handUrl();
  },
  mounted() {},
  // 组件销毁前
  beforeUnmount () {},
  methods: {
    handUrl () {
      this.ticketLoading = true;
      authGlobal.getTicket(true).then(ticket => {
        this.ticketLoading = false;
        const targetUrl = this.$common.getUrlParams({keys: 'targetSystem'});
        window.location.href = this.$common.isEmpty(ticket) ? `${targetUrl}` : `${targetUrl}?ticket=${ticket}`;
      }).catch(() => {
        this.ticketLoading = false;
        window.location.href = `${this.$common.getUrlParams({keys: 'targetSystem'})}`;
      })
    }
  }
});
</script>
<style scoped lang="scss">
.targetSystemPages{
  height: 100%;
}
</style>
