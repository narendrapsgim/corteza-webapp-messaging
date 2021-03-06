<template>
  <div
    class="droparea"
    @dragend="onHide"
    @dragleave="onHide"
  >
    <div class="message-confirm">
      <vue-dropzone
        v-if="typeSupported"
        id="dropzone"
        ref="dropzone"
        :use-custom-slot="true"
        :options="options"
        @vdropzone-drop="onDrop"
        @vdropzone-file-added="onFileAdded"
        @vdropzone-file-added-manually="onFileAdded"
        @vdropzone-complete="onComplete"
      >
        <i18next
          path="message.file.uploadHeader"
          tag="h2"
        >
          <span><br>
            <template v-if="replyTo">{{ $t('message.file.replyToThread') }}</template>
            <template v-else>{{ getLabel(channel) }}</template>
            <br></span>
        </i18next>
      </vue-dropzone>

      <div
        v-else
        class="dz-message unsupported"
      >
        <h2
          v-if="!typeSupported"
        >
          {{ $t('message.file.unsupportedType') }}
        </h2>

        <button
          class="btn btn-blue"
          @click="$emit('close')"
        >
          {{ $t('message.file.ok') }}
        </button>
      </div>

      <div
        v-if="queued && typeSupported"
        class="button-group"
      >
        <button
          class="btn btn-blue"
          @click="uploadFile"
        >
          {{ $t('message.file.send') }}
        </button>
        <button
          class="btn"
          @click="resetUpload"
        >
          {{ $t('message.file.cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import vueDropzone from 'vue2-dropzone'
import 'vue2-dropzone/dist/vue2Dropzone.min.css'
import 'corteza-webapp-messaging/src/themes/corteza-base/file-upload.scss'
import { mixins } from '@cortezaproject/corteza-vue'
import emitCloseOnEscape from 'corteza-webapp-messaging/src/mixins/emitCloseOnEscape'

export default {
  components: {
    vueDropzone,
  },

  mixins: [
    emitCloseOnEscape,
    mixins.files,
  ],

  props: {
    channelID: { type: String, required: true },
    replyTo: {
      type: String,
      required: false,
      default: undefined,
    },
    typeSupported: { type: Boolean, default: true },
  },

  data () {
    return {
      queued: 0,
    }
  },

  computed: {
    ...mapGetters({
      findChannelByID: 'channels/findByID',
    }),

    channel () {
      return this.findChannelByID(this.channelID)
    },

    options () {
      return {
        paramName: 'upload',
        maxFilesize: this.$s('Message.Attachments.MaxSize', 10), // mb
        url: () => `${this.$MessagingAPI.baseURL}/channels/${this.channelID}/attach`,
        params: () => ({ replyTo: this.replyTo }),
        thumbnailMethod: 'contain',
        thumbnailWidth: 350,
        withCredentials: true,
        autoProcessQueue: false,
        maxFiles: 1,
        addRemoveLinks: false,
        disablePreview: true,
        dictRemoveFile: 'Remove',
        acceptedFiles: null,
        headers: {
          // https://github.com/enyo/dropzone/issues/1154
          'Cache-Control': '',
          'X-Requested-With': '',
          Authorization: 'Bearer ' + this.$auth.JWT,
        },
      }
    },
  },

  methods: {
    onHide () {
      if (!this.dropzone().getAcceptedFiles().length) {
        this.$emit('close')
      }
    },

    /**
     * Provides a refference to dropzone's component
     * @returns {Component}
     */
    dropzone () {
      return this.$refs.dropzone
    },

    onDrop (e) {
      // Check if files are valid; folders won't have a type
      if (![...e.dataTransfer.files].filter(f => f.type).length) this.$emit('update:typeSupported', false)
    },

    // toggleDisabled ({ disabled }) {
    //   this.disabled = disabled
    // },

    openFilePicker ({ sourceType, opts = {} } = {}) {
      if (sourceType !== undefined && this.$store.getters['ui/isCordovaPlatform']) {
        const options = {
          quality: 100,
          destinationType: window.Camera.DestinationType.FILE_URI,
          sourceType,
          encodingType: window.Camera.EncodingType.JPEG,
          mediaType: window.Camera.MediaType.PICTURE,
          ...opts,

          // These 2 should stay like this recommended by the documentation
          // allowEdit could prompt an incompatable app
          allowEdit: false,
          // corrects android's orientation issues
          correctOrientation: true,
        }

        // Get image to tmp storage
        navigator.camera.getPicture((imageUri) => {
          // get File object
          // @note cordova-plugin-file not used, because it overwrites
          // the global File constructor, so things break...
          const xhr = new XMLHttpRequest()
          xhr.open('GET', imageUri)
          xhr.responseType = 'blob'
          xhr.onload = () => {
            // insert into dropzone
            const blob = xhr.response
            const f = new File(
              [blob],
              imageUri
                .split('/')
                .pop()
                .split('?')
                .shift() ||
                'file.jpg',
              { type: blob.type },
            )
            this.dropzone().addFile(f)
          }
          xhr.send()
        }, (err) => {
          console.error(err)
        }, options)
      } else {
        this.dropzone().$el.click()
      }
    },

    uploadFile () {
      this.dropzone().processQueue()
    },

    resetUpload () {
      this.dropzone().removeAllFiles()
      this.queued = 0
      this.$emit('close')
    },

    onFileAdded (file) {
      this.$emit('show', {})

      // Check if file type is allowed
      let types = this.$s('Message.Attachments.Mimetypes')
      if (!types || !types.length) {
        types = ['*/*']
      }
      if (!this.validateFileType(file.name, types)) {
        this.$emit('update:typeSupported', false)
        this.dropzone().removeFile(file)
        return
      }

      // If file is already in DZ, remove it and use current one
      const qFiles = this.dropzone().getQueuedFiles()
      if (qFiles.length > 0) {
        this.dropzone().removeFile(qFiles[0])
      }

      this.queued = 1
    },

    // When maximum files exceed, file upload is called and it fails instantly
    onComplete (e) {
      if (e.status !== 'error') {
        setTimeout(() => {
          this.resetUpload()
        }, 1000)
      }
    },
  },
}
</script>

<style scoped lang="scss">
@import 'corteza-webapp-messaging/src/themes/corteza-base/btns.scss';

.droparea {
  position: absolute;
  background: rgba(0,0,0,.8);
  z-index: 5;
}

.message-confirm {
  position: relative;
  top: 50%;
  -webkit-transform: translateY(-50%);
  -ms-transform: translateY(-50%);
  transform: translateY(-50%);
  z-index: 10;

  .unsupported {
    text-align: center;
    h2 {
      color: $danger;
    }
  }
}

.vue-dropzone .dz-preview .dz-remove{
  opacity: 1;
  border: none;
  margin-bottom: -40px;
  color: black;
}

.dropzone{
  position: relative;
  z-index: 100;
  width: 100%;
  height: 100vh;
  background: rgba(255,255,255,.1);

  /deep/ .dz-message{
    pointer-events: none;

    h2{
      color: $white;
      font-size: 26px;
    }
  }
  &.dz-started{
    max-width: 800px;
    height: auto;
    margin: 0 auto;
    text-align: center;
    background-color: white;
  }
  .dz-preview{
    .dz-image{
      img{
        margin: 0 auto;
      }
    }
  }
}
.vue-dropzone{
  color: black;
  border: 0 none;
}

#dropzone * {
  pointer-events: none;
}
.message-input{
  font-size: 1.2rem;
  width: 100%;
  border-radius: 3px;
  border: 1px solid #90A3B1;
  font-size: 1.2rem;
  padding-left: 20px;
  line-height: 2rem;
}
.message-input:focus{
  outline: none;
}
.button-group{
  text-align: center;
  padding: 20px;
  background: white;
  max-width: 800px;
  margin: 0 auto;
  box-shadow: 0 20px 55px rgba(0,0,0,.35), 0 0 1px rgba(0,0,0,.15);
  h3{
    margin-bottom: 30px;
  }
}

@media (min-width: $wideminwidth)
{
  #dropzone.overlayed
  {
    margin-left:320px;
    max-width:calc(100vw - 320px);
  }
}

</style>
